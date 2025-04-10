import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NotificationsList } from '../../components/NotificationsList';
import { useTheme } from 'react-native-paper';

const NotificationsScreen = () => {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <NotificationsList />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default NotificationsScreen; 