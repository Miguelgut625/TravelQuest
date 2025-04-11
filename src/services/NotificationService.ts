import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Notification } from '../types/notifications';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class NotificationService {
    private static instance: NotificationService;

    private constructor() {
        this.configureNotifications();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private async configureNotifications() {
        try {
            // Solicitar permisos
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permiso para notificaciones denegado');
                return;
            }

            // Configurar el canal de notificaciones para Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        } catch (error) {
            console.error('Error al configurar notificaciones:', error);
        }
    }

    // Método para programar una notificación local
    public async scheduleLocalNotification(
        title: string,
        body: string,
        trigger: Notifications.NotificationTriggerInput,
        userId: string
    ) {
        try {
            // Verificar si estamos en web
            if (Platform.OS === 'web') {
                // Verificar si el navegador soporta notificaciones
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (window.Notification.permission === "granted") {
                        new window.Notification(title, {
                            body: body,
                            icon: '/icon.png'
                        });
                    } else if (window.Notification.permission !== "denied") {
                        window.Notification.requestPermission().then((permission: string) => {
                            if (permission === "granted") {
                                new window.Notification(title, {
                                    body: body,
                                    icon: '/icon.png'
                                });
                            }
                        });
                    }
                }

                // Guardar la notificación en la base de datos
                const { error } = await supabase
                    .from('notifications')
                    .insert({
                        userid: userId,
                        title,
                        message: body,
                        type: 'local',
                        read: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    console.error('Error al guardar notificación en la base de datos:', error);
                }
                return;
            }

            // Para plataformas móviles
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger,
            });

            // Guardar la notificación en la base de datos
            const { error } = await supabase
                .from('notifications')
                .insert({
                    userid: userId,
                    title,
                    message: body,
                    type: 'local',
                    read: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error al guardar notificación en la base de datos:', error);
            }
        } catch (error) {
            console.error('Error al programar notificación local:', error);
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


            if (Platform.OS === 'web') {
                // Verificar si el navegador soporta notificaciones
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (window.Notification.permission === "granted") {
                        new window.Notification(title, {
                            body: body,
                            icon: '/icon.png'
                        });
                    } else if (window.Notification.permission !== "denied") {
                        window.Notification.requestPermission().then((permission: string) => {
                            if (permission === "granted") {
                                new window.Notification(title, {
                                    body: body,
                                    icon: '/icon.png'
                                });
                            }
                        });
                    }
                }
            } else {
                // Para plataformas móviles
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body,
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    },
                    trigger: { seconds: 1 },
                });
            }
        } catch (error) {
            console.error('Error al enviar notificación de viaje compartido:', error);
        }
    }

    // Método para limpiar notificaciones antiguas
    private async cleanupOldNotifications(userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('userid', userId)
                .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;
            console.log('Notificaciones antiguas limpiadas correctamente');
        } catch (error) {
            console.error('Error al limpiar notificaciones antiguas:', error);
        }
    }

    // Método para notificar sobre un viaje que está por terminar
    public async notifyJourneyEnding(
        userId: string,
        journeyDescription: string,
        hoursLeft: number
    ): Promise<void> {
        try {
            // Limpiar notificaciones antiguas primero
            await this.cleanupOldNotifications(userId);

            // Verificar si ya existe una notificación similar en las últimas 24 horas
            const { data: existingNotifications, error: checkError } = await supabase
                .from('notifications')
                .select('id, created_at')
                .eq('userid', userId)
                .eq('type', 'journey_ending')
                .eq('data->>journeyDescription', journeyDescription)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1);

            if (checkError) throw checkError;

            // Si ya existe una notificación en las últimas 24 horas, no crear una nueva
            if (existingNotifications && existingNotifications.length > 0) {
                console.log('Ya existe una notificación para este viaje en las últimas 24 horas');
                return;
            }

            const title = '¡Tu viaje está por terminar!';
            const message = `Te quedan ${hoursLeft} horas para completar las misiones de ${journeyDescription}. ¡No te quedes sin puntos!`;

            // Crear la notificación en la base de datos
            const { data: newNotification, error: createError } = await supabase
                .from('notifications')
                .insert({
                    userid: userId,
                    title,
                    message,
                    type: 'journey_ending',
                    read: false,
                    data: { journeyDescription, hoursLeft },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) throw createError;

            // Programar la notificación local solo si se creó correctamente en la base de datos
            if (newNotification) {
                await this.scheduleLocalNotification(
                    title,
                    message,
                    { seconds: 1 },
                    userId
                );
            }
        } catch (error) {
            console.error('Error al notificar fin de viaje:', error);
            throw error;
        }
    }

    // Método para notificar cuando alguien envía una solicitud de amistad
    public async notifyFriendRequest(
        userId: string,
        requesterName: string
    ) {
        const title = '¡Nueva solicitud de amistad!';
        const body = `${requesterName} quiere ser tu amigo/a`;

        try {
            // Guardar en base de datos y mostrar notificación local
            const { error } = await supabase
                .from('notifications')
                .insert({
                    userid: userId,
                    title,
                    message: body,
                    type: 'friend_request',
                    read: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error al guardar notificación de solicitud de amistad:', error);
                return;
            }

            // Mostrar notificación local sin guardarla en la base de datos
            if (Platform.OS === 'web') {
                // Verificar si el navegador soporta notificaciones
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (window.Notification.permission === "granted") {
                        new window.Notification(title, {
                            body: body,
                            icon: '/icon.png'
                        });
                    } else if (window.Notification.permission !== "denied") {
                        window.Notification.requestPermission().then((permission: string) => {
                            if (permission === "granted") {
                                new window.Notification(title, {
                                    body: body,
                                    icon: '/icon.png'
                                });
                            }
                        });
                    }
                }
            } else {
                // Para plataformas móviles
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body,
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    },
                    trigger: { seconds: 1 },
                });
            }
        } catch (error) {
            console.error('Error al enviar notificación de solicitud de amistad:', error);
        }
    }

    // Método para obtener notificaciones no leídas
    public async getUnreadNotifications(userId: string): Promise<Notification[]> {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('userid', userId)
                .eq('read', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al obtener notificaciones:', error);
            return [];
        }
    }

    // Método para marcar una notificación como leída
    public async markNotificationAsRead(notificationId: string): Promise<void> {
        try {
            // Primero obtenemos la notificación para verificar que existe
            const { data: notification, error: fetchError } = await supabase
                .from('notifications')
                .select('*')
                .eq('id', notificationId)
                .single();

            if (fetchError) throw fetchError;
            if (!notification) throw new Error('Notificación no encontrada');

            // Actualizar la notificación como leída
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ 
                    read: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', notificationId);

            if (updateError) throw updateError;

            console.log('Notificación marcada como leída correctamente');
        } catch (error) {
            console.error('Error al marcar notificación como leída:', error);
            throw error;
        }
    }

    // Método para cancelar todas las notificaciones programadas
    public async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    // Método para cancelar una notificación específica por ID
    public async cancelNotification(notificationId: string) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    }

    // Método para crear una notificación en la base de datos
    public async createNotification(
        userId: string,
        title: string,
        message: string,
        type: string,
        data?: any
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    userid: userId,
                    title,
                    message,
                    type,
                    read: false,
                    data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error al crear notificación:', error);
            throw error;
        }
    }

    // Método para registrar el dispositivo para notificaciones push
    public async registerForPushNotificationsAsync(): Promise<string | null> {
        try {
            // Verificar si estamos en web
            if (Platform.OS === 'web') {
                console.log('Las notificaciones push no están disponibles en web');
                return null;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permiso para notificaciones push denegado');
                return null;
            }

            const token = (await Notifications.getExpoPushTokenAsync()).data;
            return token;
        } catch (error) {
            console.error('Error al registrar notificaciones push:', error);
            return null;
        }
    }
}

export default NotificationService; 