import { supabase } from './supabase';
import { Alert } from 'react-native';
import NotificationService from './NotificationService';

interface Friend {
    user2Id: string;
    username: string;
    points: number;
}

export const shareJourney = async (
    journeyId: string,
    ownerId: string,
    friend: Friend
): Promise<boolean> => {
    if (!journeyId) {
        Alert.alert('Error', 'No se pudo compartir el journey porque no se encontró el ID del viaje.');
        return false;
    }

    try {
        // Obtener el nombre del viaje
        const { data: journeyData, error: journeyError } = await supabase
            .from('journeys')
            .select('description')
            .eq('id', journeyId)
            .single();

        if (journeyError) throw journeyError;

        // Obtener el nombre del usuario que comparte
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('id', ownerId)
            .single();

        if (userError) throw userError;

        // Compartir el viaje
        const { error } = await supabase
            .from('journeys_shared')
            .insert({
                journeyId,
                ownerId,
                sharedWithUserId: friend.user2Id
            });

        if (error) throw error;

        // Enviar notificación al amigo
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyJourneyShared(
            friend.user2Id,
            journeyData.description,
            userData.username
        );

        Alert.alert('Éxito', `Journey compartido con ${friend.username}`);
        return true;
    } catch (err) {
        console.error(err);
        Alert.alert('Error', 'No se pudo compartir el journey');
        return false;
    }
}; 