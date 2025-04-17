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
      return null;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return null;
    }
    
    // Intentar obtener un token de notificación usando el método clásico
    // sin especificar experienceId o projectId
    try {
      // Opción 1: Sin parámetros (enfoque más simple)
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      token = tokenResponse.data;
      return token;
    } catch (error) {
      console.error('Error obteniendo token con método clásico:', error);
      // Continuar con las alternativas...
    }
    
    // Si el método clásico falla, probar con un enfoque más compatible
    // con versiones anteriores de Expo para desarrollo local
    try {
      // Esta solución solo para desarrollo local o depuración
      // Usar una experienceId basada en el usuario actual
      const devOptions = {
        experienceId: '@miguel625guti/travelquest'
      } as any; // Usamos aserción de tipo para evitar errores de TypeScript
      
      const tokenResponseDev = await Notifications.getExpoPushTokenAsync(devOptions);
      token = tokenResponseDev.data;
      return token;
    } catch (devError) {
      console.error('Error obteniendo token (método desarrollo):', devError);
      
      // Último intento: usar directamente el projectId, pero solo si estamos en producción
      if (!__DEV__) {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          
          if (projectId) {
            // Intentar con el projectId limpiando espacios y asegurando formato
            const cleanProjectId = projectId.trim();
            
            const tokenResponseProd = await Notifications.getExpoPushTokenAsync({
              projectId: cleanProjectId
            });
            
            token = tokenResponseProd.data;
            return token;
          }
        } catch (prodError) {
          console.error('Error obteniendo token en producción:', prodError);
          throw prodError;
        }
      }
      
      // Si todos los métodos fallan
      if (__DEV__) {
        return null;
      } else {
        throw new Error('No se pudo obtener token de notificaciones por ningún método');
      }
    }
  } catch (error) {
    console.error('Error al registrar para notificaciones push:', error);
    
    // En desarrollo, no bloquear la aplicación por este error
    if (__DEV__) {
      return null;
    }
    
    throw error; // Re-lanzar el error para manejarlo en el componente (solo en producción)
  }
}

// Función para guardar el token de notificaciones push del usuario
export async function saveUserPushToken(userId: string, pushToken: string) {
  try {
    // Intentar verificar si el token ya existe (enfoque directo)
    try {
      // Probar primero con la columna 'token'
      const { data: existingToken, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', pushToken)
        .maybeSingle();
        
      if (!tokenError && existingToken) {
        console.log('Token ya registrado en columna "token"');
        return true;
      }
      
      // Si la primera consulta da error de columna inexistente, probar con push_token
      if (tokenError && tokenError.message && tokenError.message.includes("column") && tokenError.message.includes("token")) {
        const { data: existingPushToken, error: pushTokenError } = await supabase
          .from('user_push_tokens')
          .select('id')
          .eq('user_id', userId)
          .eq('push_token', pushToken)
          .maybeSingle();
          
        if (!pushTokenError && existingPushToken) {
          console.log('Token ya registrado en columna "push_token"');
          return true;
        }
      }
    } catch (checkError) {
      console.log('Error al verificar token existente:', checkError);
      // Continuar con inserción
    }

    // Intentar insertar primero con la estructura más común (columna 'token')
    const tokenData = {
      user_id: userId,
      token: pushToken,
      updated_at: new Date().toISOString(),
      platform: Platform.OS,
      device_id: `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    };
    
    const { error: insertError } = await supabase
      .from('user_push_tokens')
      .upsert(tokenData);
      
    // Si no hay error, inserción exitosa
    if (!insertError) {
      console.log('Token guardado correctamente con columna "token"');
      return true;
    }
    
    // Si el error es por clave duplicada, es un éxito (token ya registrado)
    if (insertError.code === '23505' && insertError.message.includes('user_push_tokens_user_id_token_key')) {
      console.log('Token ya existe (detectado por error de duplicado)');
      return true;
    }
    
    // Si el error es por columna no encontrada, intentar con columna 'push_token'
    if (insertError.message && insertError.message.includes("column") && insertError.message.includes("token")) {
      const pushTokenData = {
        user_id: userId,
        push_token: pushToken,
        updated_at: new Date().toISOString(),
        platform: Platform.OS,
        device_id: `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      };
      
      const { error: pushInsertError } = await supabase
        .from('user_push_tokens')
        .upsert(pushTokenData);
        
      // Si no hay error, inserción exitosa con columna push_token
      if (!pushInsertError) {
        console.log('Token guardado correctamente con columna "push_token"');
        return true;
      }
      
      // Si el error es por clave duplicada, es un éxito (token ya registrado)
      if (pushInsertError.code === '23505') {
        console.log('Token ya existe en columna push_token (detectado por error de duplicado)');
        return true;
      }
      
      console.error('Error al guardar token de notificaciones (columna push_token):', pushInsertError);
      return false;
    }
    
    console.error('Error al guardar token de notificaciones:', insertError);
    return false;
  } catch (error) {
    console.error('Error general al guardar token:', error);
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
    // Implementación más directa: intentar obtener el token sin consultar metadatos
    
    // Método 1: Intentar directamente con columna 'token'
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', receiverId)
        .maybeSingle();
        
      if (!tokenError && tokenData && tokenData.token) {
        console.log('Token encontrado en columna "token"');
        return await sendPushNotificationToExpo(tokenData.token, title, body, data);
      }
      
      // Si hay error de columna inexistente, probar con otra columna
      if (tokenError && tokenError.message && (
          tokenError.message.includes("column") || 
          tokenError.message.includes("does not exist")
      )) {
        // Método 2: Intentar con columna 'push_token'
        const { data: pushTokenData, error: pushTokenError } = await supabase
          .from('user_push_tokens')
          .select('push_token')
          .eq('user_id', receiverId)
          .maybeSingle();
          
        if (!pushTokenError && pushTokenData && pushTokenData.push_token) {
          console.log('Token encontrado en columna "push_token"');
          return await sendPushNotificationToExpo(pushTokenData.push_token, title, body, data);
        }
      }
    } catch (directError) {
      console.log('Error al intentar enviar notificación con método directo:', directError);
    }
    
    // Si llegamos aquí, no hemos podido obtener el token o enviar la notificación
    console.error('No se encontró un token válido para el usuario', receiverId);
    return false;
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
      return true;
    }
    
    const now = new Date();
    
    // Calcular la diferencia en horas entre la fecha actual y la fecha de expiración
    const hoursToExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Solo enviar notificación si la misión caduca en menos de 24 horas (1 día)
    if (hoursToExpiration <= 24 && hoursToExpiration > 0) {
      // Calcular horas restantes
      const hoursLeft = Math.ceil(hoursToExpiration);
      
      // Título y mensaje de la notificación
      const title = "¡Misión a punto de expirar!";
      const message = `Tu misión "${missionTitle}" expirará en ${hoursLeft} horas. ¡Complétala pronto!`;
      
      // Guardar en la tabla 'notifications'
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          userid: userId,
          title: title,
          message: message,
          type: 'mission_expiration_soon',
          read: false,
          data: { 
            missionId, 
            hoursLeft,
            expirationDate: expirationDate.toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (dbError) {
        // Si hay error al guardar en la base de datos, continuar con la notificación local
        console.error('Error al guardar notificación en base de datos:', dbError);
      }
      
      // Programar notificación inmediata en el dispositivo
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          data: { missionId, type: 'mission_expiration_soon' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null // Mostrar inmediatamente
      });
      
      return true;
    }
    
    // No programar notificación si la misión no caduca pronto o ya ha caducado
    return false;
  } catch (error) {
    console.error('Error al programar recordatorio de misión:', error);
    return false;
  }
}

// Función para crear la tabla de notificaciones programadas si no existe
export async function createScheduledNotificationsTable() {
  try {
    console.log('Verificando si existe la tabla scheduled_notifications...');
    
    // Enfoque más directo: intentar consultar un elemento de la tabla
    // Si la tabla no existe, esto generará un error específico
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('id')
      .limit(1);

    // Si no hay error, la tabla existe
    if (!error) {
      console.log('La tabla scheduled_notifications ya existe');
      return true;
    }
    
    // Comprobar si el error es por tabla inexistente
    if (error && error.code === '42P01') {
      console.log('La tabla scheduled_notifications no existe. No se puede crear automáticamente.');
      console.log('Para habilitar esta funcionalidad, crea manualmente la tabla en la interfaz de Supabase.');
      console.log('Instrucciones de SQL para crear la tabla:');
      console.log(`
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        mission_id UUID NOT NULL,
        mission_title TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ
      );
      
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_mission_id ON scheduled_notifications(mission_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
      `);
    } else {
      console.error('Error al verificar la tabla scheduled_notifications:', error);
    }
    
    // No podemos crear la tabla en tiempo de ejecución sin función RPC
    return false;
  } catch (error) {
    console.error('Error al verificar la tabla scheduled_notifications:', error);
    return false;
  }
}

// Función para verificar si tenemos acceso de administrador en Supabase
export async function checkAdminAccess(): Promise<boolean> {
  try {
    // Primero intentamos una consulta simple a pg_class (catálogo de sistema) para comprobar permisos
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT 1 as result"
    });
    
    // Si podemos ejecutar SQL directamente, tenemos acceso admin
    if (!error && data) {
      return true;
    }
    
    // Si exec_sql no existe o no tenemos permisos, intentamos la función check_admin_access
    const { data: adminCheck, error: adminError } = await supabase.rpc('check_admin_access', {});
    
    // Si hay un error, probablemente no tenemos permisos admin o la función no existe
    if (adminError) {
      console.log('No hay acceso admin en Supabase:', adminError.message);
      
      // Si el error es específico de función no existente, crear la función
      if (adminError.message.includes('function') && adminError.message.includes('does not exist')) {
        // No podemos crear la función si no tenemos permisos para ejecutar SQL
        console.log('La función check_admin_access no existe y no podemos crearla sin permisos.');
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar acceso admin:', error);
    return false;
  }
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {
    // Inicialización privada
  }

  // Patrón Singleton para asegurar una sola instancia
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Inicializar el servicio
  public async init() {
    // Inicialización de tablas necesarias
    try {
      // Verificar si estamos en un entorno de desarrollo con acceso admin
      const hasAccess = await checkAdminAccess();
      
      if (hasAccess) {
        console.log('Inicializando servicio de notificaciones con acceso admin...');
        // Crear tabla de notificaciones programadas si no existe
        await createScheduledNotificationsTable();
      } else {
        console.log('Inicializando servicio de notificaciones sin acceso admin');
      }
      
      // Registrar los manejadores de notificaciones
      this.registerNotificationHandlers();
      
      return true;
    } catch (error) {
      console.error('Error al inicializar el servicio de notificaciones:', error);
      return false;
    }
  }

  // Registrar manejadores de notificaciones
  private registerNotificationHandlers() {
    // Implementar según sea necesario para manejar interacciones con notificaciones
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
    sharedBy: string,
    journeyId?: string
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
          data: {
            journeyId,
            journeyName,
            sharedBy
          },
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
            data: {
              type: 'journey_shared',
              journeyId,
              sharedBy
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error al enviar notificación de viaje compartido:', error);
    }
  }

  // Método para notificar invitaciones a viajes
  public async notifyJourneyInvitation(
    userId: string,
    journeyName: string,
    journeyId: string,
    invitedBy: string,
    city: string,
    startDate: string,
    endDate: string
  ) {
    const title = '¡Nueva invitación de viaje!';
    const body = `${invitedBy} te ha invitado a unirte al viaje "${journeyName}" a ${city}`;

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
          data: {
            journeyId,
            journeyName,
            invitedBy,
            city,
            startDate,
            endDate
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error al guardar notificación de invitación:', error);
        return;
      }

      // Para plataformas móviles
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: 'journey_invitation',
              journeyId,
              invitedBy
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error al enviar notificación de invitación:', error);
    }
  }

  // Método para notificar una solicitud de amistad
  public async notifyFriendRequest(
    userId: string,
    requesterId: string,
    requesterName: string
  ) {
    const title = '¡Nueva solicitud de amistad!';
    const body = `${requesterName} quiere conectar contigo en TravelQuest`;

    try {
      // Guardar en base de datos
      const { error } = await supabase
        .from('notifications')
        .insert({
          userid: userId,
          title,
          message: body,
          type: 'friend_request',
          read: false,
          data: { 
            requesterId,
            requesterName
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error al guardar notificación de solicitud de amistad:', error);
        return false;
      }

      // Para plataformas móviles
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { 
              type: 'friend_request',
              requesterId,
              requesterName 
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Mostrar inmediatamente
        });
      }

      // También enviar notificación push
      await sendPushNotification(
        userId,
        title,
        body,
        { type: 'friend_request', requesterId, requesterName }
      );

      return true;
    } catch (error) {
      console.error('Error al enviar notificación de solicitud de amistad:', error);
      return false;
    }
  }
}

export default NotificationService; 