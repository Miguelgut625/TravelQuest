import { supabase } from './supabase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Envía una notificación push a un usuario específico
 * @param receiverId ID del usuario que recibirá la notificación
 * @param title Título de la notificación
 * @param body Cuerpo de la notificación
 * @param data Datos adicionales para la notificación
 * @returns true si se envió correctamente, false en caso contrario
 */
export async function sendPushNotification(
  receiverId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<boolean> {
  try {
    console.log(`Enviando notificación push a usuario: ${receiverId}`);
    
    // Primero intentamos obtener el token directamente, sin verificar la estructura
    console.log('Intentando obtener el token directamente...');
    
    try {
      // Intento directo para buscar en columna 'token' (predeterminada)
      const { data: tokenDataDirect, error: tokenErrorDirect } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', receiverId)
        .single();
        
      if (!tokenErrorDirect && tokenDataDirect && tokenDataDirect.token) {
        // Si encontramos un token, lo usamos directamente
        const pushToken = tokenDataDirect.token;
        console.log(`Token encontrado directamente: ${pushToken.substring(0, 10)}...`);
        
        // Enviar la notificación con el token encontrado
        return await sendActualNotification(pushToken, title, body, data);
      }
      
      // Si no funciona con 'token', intentar con 'push_token'
      const { data: pushTokenData, error: pushTokenError } = await supabase
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', receiverId)
        .single();
        
      if (!pushTokenError && pushTokenData && pushTokenData.push_token) {
        const pushToken = pushTokenData.push_token;
        console.log(`Token alternativo encontrado: ${pushToken.substring(0, 10)}...`);
        
        // Enviar la notificación con el token encontrado
        return await sendActualNotification(pushToken, title, body, data);
      }
      
      // Si llegamos aquí, es que no hemos encontrado token por los métodos directos
      console.log('No se encontró token mediante acceso directo, intentando método avanzado...');
    } catch (directError) {
      console.log('Error al intentar el método directo:', directError);
      // Continuar con el método avanzado
    }
    
    // Primero verificar que la tabla existe
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_push_tokens');
    
    if (tableError) {
      console.error('Error verificando la tabla user_push_tokens, intentando acceder directamente:', tableError);
      
      // Intentamos acceso directo a un token para este usuario
      try {
        // Usar el nombre de columna 'token' por defecto
        console.log('Intentando obtener token usando API directa...');
        const { data: directTokenData, error: directTokenError } = await supabase
          .from('user_push_tokens')
          .select('token, id')
          .eq('user_id', receiverId)
          .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores si no existe
          
        if (!directTokenError && directTokenData && directTokenData.token) {
          console.log(`Token encontrado mediante acceso directo con columna 'token': ${directTokenData.token.substring(0, 10)}...`);
          return await sendActualNotification(directTokenData.token, title, body, data);
        }
        
        // Si llegamos aquí, no encontramos token
        console.log('No se encontró token mediante acceso directo a la tabla user_push_tokens');
        return false;
      } catch (directAccessError) {
        console.error('Error en acceso directo a tabla:', directAccessError);
        return false;
      }
    }
    
    if (!tableInfo || tableInfo.length === 0) {
      console.error('La tabla user_push_tokens no existe');
      return false;
    }
    
    console.log('Tabla user_push_tokens encontrada');
    
    // Intentar obtener las columnas de la tabla para saber qué campo de token usar
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, character_maximum_length')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_push_tokens');
    
    if (columnsError) {
      console.error('Error verificando columnas de la tabla user_push_tokens:', columnsError);
      return false;
    }
    
    // Obtener los nombres de las columnas como un array e imprimir info detallada
    const columnNames = columnsData?.map(col => col.column_name.toLowerCase()) || [];
    console.log('Estructura de la tabla user_push_tokens:');
    columnsData?.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}${col.character_maximum_length ? `, max length: ${col.character_maximum_length}` : ''})`);
    });
    
    // Determinar qué columna contiene el token - asumimos 'token' como valor por defecto
    // para la tabla configurada por el usuario
    let tokenColumnName = 'token'; // por defecto
    if (columnNames.includes('push_token')) {
      tokenColumnName = 'push_token';
    } else if (!columnNames.includes('token')) {
      console.error('No se encontró ninguna columna de token válida. Columnas disponibles:', columnNames);
      return false;
    }
    
    // Obtener el token del usuario usando el nombre de columna correcto
    console.log(`Buscando token en columna: ${tokenColumnName}`);
    
    // Hacer un simple select para ver si hay registros
    const { data: records, error: countError } = await supabase
      .from('user_push_tokens')
      .select('id')
      .eq('user_id', receiverId);
      
    if (countError) {
      console.error('Error verificando registros para el usuario:', countError);
      return false;
    }
    
    console.log(`Encontrados ${records?.length || 0} registros para el usuario ${receiverId}`);
    
    // Obtener el token específico
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select(`user_id,${tokenColumnName}`)
      .eq('user_id', receiverId)
      .single();
      
    if (tokenError || !tokenData) {
      console.log('No se encontró token de notificación para el usuario:', receiverId);
      console.error('Error:', tokenError);
      return false;
    }
    
    // Obtener el valor del token de la columna correcta
    const pushToken = tokenData[tokenColumnName];
    if (!pushToken) {
      console.log('Token vacío para el usuario:', receiverId);
      return false;
    }
    
    console.log(`Token encontrado: ${pushToken.substring(0, 10)}...`);
    
    // Enviar la notificación
    return await sendActualNotification(pushToken, title, body, data);
  } catch (error) {
    console.error('Error general enviando notificación push:', error);
    return false;
  }
}

// Función auxiliar para enviar la notificación real una vez que tenemos el token
async function sendActualNotification(
  pushToken: string, 
  title: string, 
  body: string, 
  data: Record<string, any> = {}
): Promise<boolean> {
  try {
    // En plataformas móviles, enviar notificación local
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
      
      console.log('Notificación local programada con éxito');
    }
    
    // Intentar enviar notificación push a través del servicio de Expo
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    };
    
    console.log('Enviando mensaje push a Expo:', JSON.stringify(message));
    
    // Enviar a la API de notificaciones de Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const responseData = await response.json();
    console.log('Respuesta de Expo Push Service:', JSON.stringify(responseData));
    
    if (responseData.data && responseData.data.status === 'error') {
      console.error('Error enviando push a través de Expo:', responseData.data.message);
      return false;
    }
    
    return true;
  } catch (pushError) {
    console.error('Error enviando notificación a través de Expo:', pushError);
    return false;
  }
} 