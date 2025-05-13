import { Platform } from 'react-native';

export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
) {
    try {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        return true;
    } catch (error) {
        console.error('Error al enviar notificación push:', error);
        return false;
    }
} 