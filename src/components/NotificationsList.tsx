import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import NotificationService from '../services/NotificationService';
import { useAppSelector } from '../features/hooks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification } from '../types/notifications';

export const NotificationsList = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const userId = useAppSelector(state => state.auth.user?.id);
    const notificationService = NotificationService.getInstance();

    useEffect(() => {
        if (userId) {
            loadNotifications();
        }
    }, [userId]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const unreadNotifications = await notificationService.getUnreadNotifications(userId!);
            setNotifications(unreadNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationPress = async (notification: Notification) => {
        try {
            await notificationService.markNotificationAsRead(notification.id);
            loadNotifications(); // Recargar las notificaciones
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style= { styles.notificationItem }
    onPress = {() => handleNotificationPress(item)}
        >
    <View style={ styles.notificationContent }>
        <Text style={ styles.notificationTitle }> { item.title } </Text>
            < Text style = { styles.notificationMessage } > { item.message } </Text>
                < Text style = { styles.notificationDate } >
                    { format(new Date(item.created_at), 'PPP p', { locale: es })}
</Text>
    </View>
    </TouchableOpacity>
    );

if (loading) {
    return (
        <View style= { styles.container } >
        <Text>Cargando notificaciones...</Text>
            </View>
        );
}

return (
    <View style= { styles.container } >
    <FlatList
                data={ notifications }
renderItem = { renderNotification }
keyExtractor = { item => item.id }
ListEmptyComponent = {
                    < View style = { styles.emptyContainer } >
    <Text>No hay notificaciones nuevas </Text>
        </View>
                }
            />
    </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    notificationItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    notificationDate: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
}); 