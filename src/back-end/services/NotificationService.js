const { supabase } = require('../../services/supabase.server.js');

class NotificationService {
    constructor() {
        if (NotificationService.instance) {
            return NotificationService.instance;
        }
        NotificationService.instance = this;
    }

    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    async notifyFriendRequest(receiverId, senderId, senderUsername) {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    userId: receiverId,
                    type: 'friend_request',
                    title: 'Nueva solicitud de amistad',
                    message: `${senderUsername} te ha enviado una solicitud de amistad`,
                    data: {
                        senderId,
                        senderUsername
                    },
                    read: false
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al enviar notificación:', error);
            return false;
        }
    }

    async notifyFriendRequestAccepted(userId, friendId, friendUsername) {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    userId,
                    type: 'friend_request_accepted',
                    title: 'Solicitud de amistad aceptada',
                    message: `${friendUsername} ha aceptado tu solicitud de amistad`,
                    data: {
                        friendId,
                        friendUsername
                    },
                    read: false
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al enviar notificación:', error);
            return false;
        }
    }
}

module.exports = NotificationService; 