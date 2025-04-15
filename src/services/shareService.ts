import { supabase } from './supabase';
import { Alert } from 'react-native';

interface Friend {
    user2Id: string;
    username: string;
    points: number;
}

export async function shareJourney(journeyId: string, ownerId: string, friend: Friend) {
    try {
        // Validar que el journey existe
        const { data: journey, error: journeyError } = await supabase
            .from('journeys')
            .select(`
                id,
                description,
                journeys_missions (
                    id,
                    challengeId,
                    end_date
                )
            `)
            .eq('id', journeyId)
            .single();

        if (journeyError || !journey) {
            Alert.alert('Error', 'No se encontró el viaje');
            return false;
        }

        // Obtener el username del propietario
        const { data: owner, error: ownerError } = await supabase
            .from('users')
            .select('username')
            .eq('id', ownerId)
            .single();

        if (ownerError || !owner) {
            Alert.alert('Error', 'No se encontró el usuario');
            return false;
        }

        // Insertar en la tabla de viajes compartidos
        const { error: shareError } = await supabase
            .from('journeys_shared')
            .insert({
                journeyId: journeyId,
                ownerId: ownerId,
                sharedWithUserId: friend.user2Id,
                status: 'pending'
            });

        if (shareError) {
            console.error('Error al compartir:', shareError);
            Alert.alert('Error', 'No se pudo compartir el viaje');
            return false;
        }

        // Crear las misiones compartidas
        const missionsToCreate = journey.journeys_missions.map(mission => ({
            journeyId: journeyId,
            challengeId: mission.challengeId,
            end_date: mission.end_date,
            userId: friend.user2Id,
            completed: false
        }));

        const { error: missionsError } = await supabase
            .from('journeys_missions')
            .insert(missionsToCreate);

        if (missionsError) {
            console.error('Error al crear misiones compartidas:', missionsError);
            Alert.alert('Error', 'No se pudieron crear las misiones compartidas');
            return false;
        }

        Alert.alert('Éxito', `Has compartido el viaje con ${friend.username}`);
        return true;
    } catch (error) {
        console.error('Error al compartir viaje:', error);
        Alert.alert('Error', 'Ocurrió un error al compartir el viaje');
        return false;
    }
} 