import { supabase } from './supabase';
import { Alert } from 'react-native';

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
        const { error } = await supabase
            .from('journeys_shared')
            .insert({
                journeyId,
                ownerId,
                sharedWithUserId: friend.user2Id
            });

        if (error) throw error;

        Alert.alert('Éxito', `Journey compartido con ${friend.username}`);
        return true;
    } catch (err) {
        console.error(err);
        Alert.alert('Error', 'No se pudo compartir el journey');
        return false;
    }
}; 