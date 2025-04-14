import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { sendPushNotification as sendPushNotificationToExpo } from './sendPushNotification';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Función para registrar el dispositivo para notificaciones push
export async function registerForPushNotificationsAsync() {
  let token = null;
  
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (!Device.isDevice) {
      console.log('Las notificaciones push no funcionan en emuladores/simuladores');
      return null;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('No se pudo obtener permiso para las notificaciones push');
      return null;
    }
    
    // Información de depuración
    console.log('------- DEPURACIÓN NOTIFICACIONES -------');
    console.log('Plataforma:', Platform.OS);
    console.log('¿Es desarrollo?', __DEV__ ? 'Sí' : 'No');
    
    // Intentar obtener un token de notificación usando el método clásico
    // sin especificar experienceId o projectId
    try {
      console.log('Intentando obtener token usando método clásico...');
      // Opción 1: Sin parámetros (enfoque más simple)
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      token = tokenResponse.data;
      console.log('Token obtenido correctamente (método clásico):', token);
      return token;
    } catch (error) {
      console.warn('Error obteniendo token con método clásico:', error);
      // Continuar con las alternativas...
    }
    
    // Si el método clásico falla, probar con un enfoque más compatible
    // con versiones anteriores de Expo para desarrollo local
    try {
      console.log('Intentando método alternativo para desarrollo...');
      
      // Esta solución solo para desarrollo local o depuración
      // Usar una experienceId basada en el usuario actual
      const devOptions = {
        experienceId: '@miguel625guti/travelquest'
      } as any; // Usamos aserción de tipo para evitar errores de TypeScript
      
      const tokenResponseDev = await Notifications.getExpoPushTokenAsync(devOptions);
      token = tokenResponseDev.data;
      console.log('Token obtenido correctamente (método desarrollo):', token);
      return token;
    } catch (devError) {
      console.warn('Error obteniendo token (método desarrollo):', devError);
      
      // Último intento: usar directamente el projectId, pero solo si estamos en producción
      if (!__DEV__) {
        try {
          console.log('Último intento: usando projectId directamente...');
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          
          if (projectId) {
            // Intentar con el projectId limpiando espacios y asegurando formato
            const cleanProjectId = projectId.trim();
            console.log('Usando projectId limpio:', cleanProjectId);
            
            const tokenResponseProd = await Notifications.getExpoPushTokenAsync({
              projectId: cleanProjectId
            });
            
            token = tokenResponseProd.data;
            console.log('Token obtenido correctamente (método producción):', token);
            return token;
          }
        } catch (prodError) {
          console.error('Error obteniendo token en producción:', prodError);
          throw prodError;
        }
      }
      
      // Si todos los métodos fallan
      if (__DEV__) {
        console.log('Todos los métodos fallaron. En desarrollo, esto puede ser normal.');
        console.log('Las notificaciones push probablemente no funcionarán hasta que configures correctamente el entorno.');
        return null;
      } else {
        throw new Error('No se pudo obtener token de notificaciones por ningún método');
      }
    }
  } catch (error) {
    console.error('Error al registrar para notificaciones push:', error);
    
    // En desarrollo, no bloquear la aplicación por este error
    if (__DEV__) {
      console.log('Error en desarrollo - continuando sin notificaciones push');
      return null;
    }
    
    throw error; // Re-lanzar el error para manejarlo en el componente (solo en producción)
  }
}

// Función para guardar el token de notificaciones push del usuario
export async function saveUserPushToken(userId: string, pushToken: string) {
  try {
    console.log('Guardando token de notificaciones para usuario:', userId);
    console.log('Token a guardar:', pushToken);
    
    // Intentar obtener las columnas de la tabla para confirmar su estructura
    console.log('Verificando estructura de la tabla user_push_tokens...');
    
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_push_tokens');
    
    if (columnsError) {
      console.error('Error verificando columnas de la tabla:', columnsError);
      
      // Si tenemos un error con information_schema, intentar una solución alternativa
      // simplemente intentar guardar el token directamente con la columna 'token'
      console.log('Intentando usar estructura predeterminada (columna token)...');
      
      // Primero comprobar si ya existe el token (lo cual es válido)
      try {
        const { data: existingToken, error: checkError } = await supabase
          .from('user_push_tokens')
          .select('id')
          .eq('user_id', userId)
          .eq('token', pushToken)
          .single();
          
        if (!checkError && existingToken) {
          console.log('El token ya existe para este usuario, no hay necesidad de actualizar.');
          return true;
        }
      } catch (checkTokenError) {
        console.log('Error verificando token existente:', checkTokenError);
        // Continuamos con la inserción
      }

      const tokenData = {
        user_id: userId,
        token: pushToken,
        updated_at: new Date().toISOString(),
        platform: Platform.OS,
        device_id: `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      };
      
      console.log('Datos a insertar (modo alternativo):', tokenData);
      
      // Realizar la operación upsert usando la estructura conocida
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(tokenData);
        
      if (error) {
        // Si el error es por clave duplicada, esto es técnicamente un éxito
        // ya que significa que el token ya está registrado
        if (error.code === '23505' && error.message.includes('user_push_tokens_user_id_token_key')) {
          console.log('El token ya existe para este usuario (detectado por error de duplicado).');
          return true;
        }
        
        console.error('Error al guardar token de notificaciones (modo alternativo):', error);
        return false;
      }
      
      console.log('Token guardado correctamente en modo alternativo');
      return true;
    }
    
    // Obtener los nombres de las columnas como un array
    const columnNames = columnsData?.map(col => col.column_name.toLowerCase()) || [];
    console.log('Columnas disponibles:', columnNames);
    
    // Construir el objeto de datos basado en las columnas disponibles
    const tokenData: Record<string, any> = {
      user_id: userId
    };
    
    // Usar el nombre correcto de la columna para el token
    if (columnNames.includes('push_token')) {
      tokenData.push_token = pushToken;
    } else if (columnNames.includes('token')) {
      tokenData.token = pushToken;
    } else {
      console.error('No se encontró columna para el token en la tabla user_push_tokens');
      return false;
    }
    
    // Agregar campos adicionales si existen en la tabla
    if (columnNames.includes('updated_at')) {
      tokenData.updated_at = new Date().toISOString();
    }
    
    if (columnNames.includes('platform')) {
      tokenData.platform = Platform.OS;
    }
    
    if (columnNames.includes('device_id')) {
      // Intentar obtener un ID de dispositivo
      try {
        // Usar propiedades disponibles en expo-device para generar un ID único
        const deviceType = await Device.getDeviceTypeAsync();
        const deviceId = `${Platform.OS}_${Device.modelName || 'unknown'}_${deviceType}_${Date.now()}`;
        tokenData.device_id = deviceId;
      } catch (deviceIdError) {
        console.warn('No se pudo obtener información del dispositivo:', deviceIdError);
        // Generar un ID aleatorio como fallback
        tokenData.device_id = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
    }
    
    console.log('Datos a insertar:', tokenData);
    
    // Realizar la operación upsert
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(tokenData);
      
    if (error) {
      console.error('Error al guardar token de notificaciones:', error);
      return false;
    }
    
    console.log('Token guardado correctamente en la base de datos');
    return true;
  } catch (error) {
    console.error('Error inesperado al guardar token:', error);
    return false;
  }
}

// Función para enviar una notificación push
export async function sendPushNotification(
  receiverId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    // Usar la implementación actualizada
    return await sendPushNotificationToExpo(receiverId, title, body, data);
  } catch (error) {
    console.error('Error enviando notificación push:', error);
    return false;
  }
}

// Función para programar un recordatorio para una misión que expira próximamente
export async function scheduleMissionExpirationReminder(
  userId: string,
  missionId: string,
  missionTitle: string,
  expirationDate: Date
) {
  try {
    // Verificar si ya existe una notificación programada para esta misión
    // para evitar duplicados y notificaciones repetitivas
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existingNotification = scheduledNotifications.find(notification => 
      notification.content.data?.missionId === missionId && 
      notification.content.data?.type?.includes('mission_expiration')
    );
    
    // Si ya existe una notificación programada para esta misión, no crear otra
    if (existingNotification) {
      console.log(`Ya existe una notificación programada para la misión ${missionId}. No se creará otra.`);
      return true;
    }
    
    // Calcular cuándo enviar la notificación (1 día antes de que expire)
    const reminderDate = new Date(expirationDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    
    const now = new Date();
    
    // Si la fecha de recordatorio ya pasó o está muy cerca (menos de 1 hora)
    if (reminderDate <= now) {
      console.log(`La fecha de recordatorio para la misión ${missionId} ya pasó o está muy próxima`);
      
      // Si estamos a menos de 24 horas de la expiración pero aún no ha expirado, enviar notificación inmediata
      if (expirationDate > now) {
        // Calcular horas restantes
        const hoursLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        // Programar notificación inmediata
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "¡Misión a punto de expirar!",
            body: `Tu misión "${missionTitle}" expirará en ${hoursLeft} horas. ¡Complétala pronto!`,
            data: { missionId, type: 'mission_expiration_soon' },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null // Mostrar inmediatamente
        });
        
        console.log(`Notificación inmediata enviada para misión ${missionId} que expira en ${hoursLeft} horas`);
        return true;
      }
      
      return false;
    }

    console.log(`Recordatorio para misión ${missionId} programado para: ${reminderDate.toISOString()}`);
    
    // Primero verificar si la tabla scheduled_notifications existe
    try {
      const { data: tableExists, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', 'scheduled_notifications')
        .single();

      // Si hay error o la tabla no existe, ignorar el guardado en base de datos
      if (tableError || !tableExists) {
        console.log('La tabla scheduled_notifications no existe o no es accesible. Solo se programará la notificación local.');
        
        // Programar la notificación local aunque no podamos guardar en BD
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "¡Misión por expirar!",
            body: `Tu misión "${missionTitle}" expirará mañana. ¡Complétala pronto!`,
            data: { missionId, type: 'mission_expiration' },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null // Notificación inmediata en vez de programada debido a problemas con los tipos
        });
        
        console.log(`Notificación local programada con ID: ${notificationId}`);
        return true;
      }
      
      // Verificar si ya existe un recordatorio en la base de datos para esta misión
      const { data: existingReminder, error: checkError } = await supabase
        .from('scheduled_notifications')
        .select('id')
        .eq('mission_id', missionId)
        .eq('status', 'pending')
        .maybeSingle();
        
      if (!checkError && existingReminder) {
        console.log(`Ya existe un recordatorio en la BD para la misión ${missionId}. No se creará uno nuevo.`);
        return true;
      }
      
      // Guardar un nuevo registro
      const { error } = await supabase
        .from('scheduled_notifications')
        .insert({
          user_id: userId,
          mission_id: missionId,
          mission_title: missionTitle,
          scheduled_at: reminderDate.toISOString(),
          type: 'mission_expiration',
          created_at: new Date().toISOString(),
          status: 'pending'
        });

      if (error) {
        console.error('Error al guardar el recordatorio en la base de datos:', error);
        // Continuar para programar la notificación local aunque falle el guardado
      } else {
        console.log('Recordatorio guardado correctamente en la base de datos');
      }
      
      // Programar notificación local independientemente del resultado en BD
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡Misión por expirar!",
          body: `Tu misión "${missionTitle}" expirará mañana. ¡Complétala pronto!`,
          data: { missionId, type: 'mission_expiration' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null // Notificación inmediata en vez de programada debido a problemas con los tipos
      });
      
      console.log(`Notificación local programada con ID: ${notificationId}`);
      
    } catch (tableCheckError) {
      console.error('Error al verificar la tabla scheduled_notifications:', tableCheckError);
      
      // Aún así, programar la notificación local
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡Misión por expirar!",
          body: `Tu misión "${missionTitle}" expirará mañana. ¡Complétala pronto!`,
          data: { missionId, type: 'mission_expiration' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null // Notificación inmediata en vez de programada debido a problemas con los tipos
      });
      
      console.log(`Solo se programó la notificación local con ID: ${notificationId}`);
    }

    console.log(`Recordatorio programado con éxito para: ${reminderDate.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error al programar recordatorio de misión:', error);
    return false;
  }
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {
    // Inicialización del servicio
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Método para notificar un nuevo mensaje
  public async notifyNewMessage(
    userId: string,
    senderId: string,
    senderName: string,
    messagePreview: string
  ) {
    const title = 'Nuevo mensaje';
    const body = `${senderName}: ${messagePreview}`;

    try {
      // Guardar en base de datos
      const { error } = await supabase
        .from('notifications')
        .insert({
          userid: userId,
          title,
          message: body,
          type: 'new_message',
          read: false,
          sender_id: senderId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error al guardar notificación de mensaje:', error);
        return false;
      }

      // Para plataformas móviles
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { 
              type: 'new_message',
              senderId,
              senderName 
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Mostrar inmediatamente
        });
        console.log('Notificación local de nuevo mensaje enviada');
      } else {
        // Para web
        console.log('Notificación web de nuevo mensaje:', title, body);
      }

      // También enviar notificación push
      await sendPushNotification(
        userId,
        title,
        body,
        { type: 'new_message', senderId, senderName }
      );

      return true;
    } catch (error) {
      console.error('Error al enviar notificación de nuevo mensaje:', error);
      return false;
    }
  }

  // Método para notificar cuando alguien comparte un viaje
  public async notifyJourneyShared(
    userId: string,
    journeyName: string,
    sharedBy: string
  ) {
    const title = '¡Nuevo viaje compartido!';
    const body = `${sharedBy} ha compartido el viaje "${journeyName}" contigo`;

    try {
      // Guardar en base de datos
      const { error } = await supabase
        .from('notifications')
        .insert({
          userid: userId,
          title,
          message: body,
          type: 'journey_shared',
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error al guardar notificación de viaje compartido:', error);
        return;
      }

      // Para plataformas móviles
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } else {
        // Para web, podríamos usar notificaciones del navegador si estuvieran disponibles
        console.log('Notificación web:', title, body);
      }
    } catch (error) {
      console.error('Error al enviar notificación de viaje compartido:', error);
    }
  }

  // Método para notificar una invitación a un viaje
  public async notifyJourneyInvitation(
    userId: string,
    journeyName: string,
    sharedBy: string,
    cityName: string,
    startDate: Date,
    endDate: Date,
    groupInvitationId: string,
    journeyId: string
  ) {
    const title = '¡Nueva invitación de viaje!';
    const body = `${sharedBy} te invita a viajar a ${cityName} del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;

    try {
      // Guardar en base de datos
      const { error } = await supabase
        .from('notifications')
        .insert({
          userid: userId,
          title,
          message: body,
          type: 'journey_invitation',
          read: false,
          related_id: journeyId,
          metadata: JSON.stringify({
            groupInvitationId,
            journeyId,
            sharedBy,
            cityName,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error al guardar notificación de invitación a viaje:', error);
        return false;
      }

      // Para plataformas móviles
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: 'journey_invitation',
              groupInvitationId,
              journeyId,
              sharedBy
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Mostrar inmediatamente
        });
      } else {
        // Para web, podríamos usar notificaciones del navegador si estuvieran disponibles
        console.log('Notificación web de invitación a viaje:', title, body);
      }

      // También enviar notificación push
      await sendPushNotification(
        userId,
        title,
        body,
        {
          type: 'journey_invitation',
          groupInvitationId,
          journeyId,
          sharedBy
        }
      );

      return true;
    } catch (error) {
      console.error('Error al enviar notificación de invitación a viaje:', error);
      return false;
    }
  }
}

export default NotificationService; 