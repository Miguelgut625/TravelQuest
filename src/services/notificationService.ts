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
    // Intentar obtener las columnas de la tabla para confirmar su estructura
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_push_tokens');
    
    if (columnsError) {
      console.error('Error verificando columnas de la tabla:', columnsError);
      
      // Si tenemos un error con information_schema, intentar una solución alternativa
      // simplemente intentar guardar el token directamente con la columna 'token'
      
      // Primero comprobar si ya existe el token (lo cual es válido)
      try {
        const { data: existingToken, error: checkError } = await supabase
          .from('user_push_tokens')
          .select('id')
          .eq('user_id', userId)
          .eq('token', pushToken)
          .single();
          
        if (!checkError && existingToken) {
          return true;
        }
      } catch (checkTokenError) {
        // Continuamos con la inserción
      }

      const tokenData = {
        user_id: userId,
        token: pushToken,
        updated_at: new Date().toISOString(),
        platform: Platform.OS,
        device_id: `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      };
      
      // Realizar la operación upsert usando la estructura conocida
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(tokenData);
        
      if (error) {
        // Si el error es por clave duplicada, esto es técnicamente un éxito
        // ya que significa que el token ya está registrado
        if (error.code === '23505' && error.message.includes('user_push_tokens_user_id_token_key')) {
          return true;
        }
        
        console.error('Error al guardar token de notificaciones (modo alternativo):', error);
        return false;
      }
      
      return true;
    }
    
    // Obtener los nombres de las columnas como un array
    const columnNames = columnsData?.map(col => col.column_name.toLowerCase()) || [];
    
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
        // Generar un ID aleatorio como fallback
        tokenData.device_id = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
    }
    
    // Realizar la operación upsert
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(tokenData);
      
    // Si hay un error, el token podría existir
    if (error) {
      if (error.code === '23505') {
        // Error de duplicado, lo cual es técnicamente correcto ya que el token ya existe
        return true;
      }
      
      console.error('Error al guardar token de notificaciones:', error);
      return false;
    }
    
    return true;
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
          data: JSON.stringify({ 
            missionId, 
            hoursLeft,
            expirationDate: expirationDate.toISOString()
          }),
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
    
    // Verificar si la tabla existe
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'scheduled_notifications')
      .single();

    // Si la tabla ya existe, no hacer nada
    if (!tableError && tableExists) {
      console.log('La tabla scheduled_notifications ya existe');
      return true;
    }
    
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
    // Intentamos una operación simple que requeriría acceso admin
    const { data, error } = await supabase.rpc('check_admin_access', {});
    
    // Si hay un error, probablemente no tenemos permisos admin
    if (error) {
      console.log('No hay acceso admin en Supabase:', error.message);
      
      // Si el error es específico de función no existente, crear la función
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        // Intentar crear la función check_admin_access
        const createFunctionResult = await createCheckAdminFunction();
        if (createFunctionResult) {
          // Intentar nuevamente
          const { data: retryData, error: retryError } = await supabase.rpc('check_admin_access', {});
          return !retryError && !!retryData;
        }
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar acceso admin:', error);
    return false;
  }
}

// Función para crear la función check_admin_access en Supabase
async function createCheckAdminFunction(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
      CREATE OR REPLACE FUNCTION check_admin_access()
      RETURNS boolean AS $$
      BEGIN
        -- Intentar realizar una operación que requiere acceso admin
        -- Esta es una verificación simple que fallará si no hay permisos
        RETURN true;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RETURN false;
        WHEN OTHERS THEN
          RETURN false;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (error) {
      console.error('Error al crear función check_admin_access:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al crear función check_admin_access:', error);
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