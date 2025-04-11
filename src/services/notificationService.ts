import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Obtener token de notificaciones del dispositivo
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    console.log('Configurando canal de notificaciones para Android...');
    try {
      // Configurar el canal de notificación para Android
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: true,
        lightColor: '#005F9E',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
      console.log('Canal de notificaciones configurado correctamente');
    } catch (error) {
      console.error('Error configurando canal de notificaciones:', error);
    }
  }

  if (Device.isDevice) {
    try {
      // Verificar permisos actuales
      console.log('Verificando permisos de notificaciones...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Estado actual de permisos:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Si no tenemos permiso, solicitarlo
      if (existingStatus !== 'granted') {
        console.log('Solicitando permisos de notificaciones...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Nuevo estado de permisos:', finalStatus);
      }
      
      // Si no se otorgaron permisos, no podemos obtener el token
      if (finalStatus !== 'granted') {
        console.log('No se obtuvo permiso para notificaciones push');
        return null;
      }
      
      // Obtener token de Expo
      console.log('Obteniendo token de Expo Notifications...');
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'travelquest', // Asegúrate de que este sea tu ID de proyecto de Expo
      })).data;
      
      console.log('Token de notificaciones obtenido:', token);
      
      // En Android, necesitamos registrar el canal para que lleguen las notificaciones
      if (Platform.OS === 'android') {
        console.log('Verificando registro del canal en Android...');
        const channels = await Notifications.getNotificationChannelsAsync();
        console.log('Canales disponibles:', channels.map(c => c.name));
      }
      
    } catch (error) {
      console.error('Error obteniendo token de notificaciones:', error);
      return null;
    }
  } else {
    console.log('Las notificaciones push requieren un dispositivo físico');
  }

  return token;
}

// Guardar token en la base de datos asociado al usuario
export async function saveUserPushToken(userId: string, token: string) {
  try {
    // Primero verificamos si ya existe un token para este usuario
    const { data: existingTokens, error: fetchError } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error verificando tokens existentes:', fetchError);
      return false;
    }
    
    // Si ya existe, actualizamos
    if (existingTokens && existingTokens.length > 0) {
      const { error } = await supabase
        .from('push_tokens')
        .update({ token, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error actualizando token:', error);
        return false;
      }
      
      console.log('Token actualizado correctamente');
      return true;
    } 
    
    // Si no existe, insertamos uno nuevo
    const { error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
    if (error) {
      console.error('Error guardando token:', error);
      return false;
    }
    
    console.log('Token guardado correctamente');
    return true;
  } catch (error) {
    console.error('Error inesperado guardando token:', error);
    return false;
  }
}

// Enviar notificación a un usuario específico
export async function sendPushNotification(userId: string, title: string, body: string, data = {}) {
  try {
    // Buscar el token del usuario
    const { data: tokenData, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .single();
      
    if (error || !tokenData) {
      console.error('Error obteniendo token del usuario:', error);
      return false;
    }
    
    const token = tokenData.token;
    
    // Validar formato del token
    if (!token || !token.startsWith('ExponentPushToken[')) {
      console.error('Token de notificación inválido:', token);
      return false;
    }
    
    // Preparar el mensaje
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data,
      badge: 1,
      channelId: 'messages', // Para Android - debe coincidir con el canal creado
      priority: 'high', // Para Android
    };
    
    console.log('Enviando notificación push:', message);
    
    // Enviar notificación usando la API de Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const responseData = await response.json();
    console.log('Respuesta de Expo Push Service:', responseData);
    
    if (responseData.errors && responseData.errors.length > 0) {
      console.error('Errores al enviar notificación:', responseData.errors);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error enviando notificación push:', error);
    return false;
  }
}

// Enviar notificación de mensaje nuevo
export async function sendNewMessageNotification(
  receiverId: string, 
  senderName: string, 
  messagePreview: string
) {
  return sendPushNotification(
    receiverId,
    `Mensaje de ${senderName}`,
    messagePreview.length > 50 ? messagePreview.substring(0, 47) + '...' : messagePreview,
    { type: 'new_message', senderId: receiverId }
  );
} 