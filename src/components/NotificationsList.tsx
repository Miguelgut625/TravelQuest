import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import NotificationService from '../services/NotificationService';
import { useAppSelector } from '../features/hooks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification } from '../types/notifications';
import { colors, commonStyles, typography, spacing, shadows, borderRadius } from '../styles/theme';

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
        ...commonStyles.container,
        padding: spacing.md,
    },
    notificationItem: {
        ...commonStyles.card,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        ...typography.body,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    notificationMessage: {
        ...typography.small,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    notificationDate: {
        ...typography.caption,
        color: colors.text.secondary,
    },
    emptyContainer: {
        ...commonStyles.emptyContainer,
    },
}); 