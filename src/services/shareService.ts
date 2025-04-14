import { supabase } from './supabase';
import NotificationService from './NotificationService';
import { Alert } from 'react-native';
import { createJourneyGroup } from './groupService';

// Definir la interfaz Friend aquí ya que no se exporta desde FriendsScreen
export interface Friend {
  user2Id: string;
  username: string;
  points: number;
}

// Función para compartir un viaje con un amigo
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
        // Obtener información del viaje (nombre de la ciudad, fechas)
        const { data: journeyData, error: journeyError } = await supabase
            .from('journeys')
            .select(`
                id,
                description,
                start_date,
                end_date,
                cityId,
                cities (
                    id,
                    name
                )
            `)
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

        // Verificar si el viaje ya fue compartido
        const { data: existingShare, error: existingShareError } = await supabase
            .from('journeys_shared')
            .select('id, status')
            .eq('journeyId', journeyId)
            .eq('sharedWithUserId', friend.user2Id)
            .single();

        // Si ya existe y está aceptado, no hacemos nada
        if (!existingShareError && existingShare && existingShare.status === 'accepted') {
            Alert.alert('Información', `El viaje ya fue compartido con ${friend.username} anteriormente.`);
            return true;
        }

        // Preparar fechas
        const startDate = new Date(journeyData.start_date);
        const endDate = new Date(journeyData.end_date);
        const cityName = journeyData.cities?.name || 'destino desconocido';

        // Crear un grupo para el viaje
        const groupResult = await createJourneyGroup(
            journeyId,
            ownerId,
            friend.user2Id,
            cityName,
            startDate,
            endDate
        );

        if (!groupResult.success) {
            throw new Error('No se pudo crear el grupo para el viaje');
        }

        // Guardar en journeys_shared con estado pendiente si no existía antes
        if (existingShareError || !existingShare) {
            const { error } = await supabase
                .from('journeys_shared')
                .insert({
                    journeyId,
                    ownerId,
                    sharedWithUserId: friend.user2Id,
                    status: 'pending',
                    groupId: groupResult.groupId
                });

            if (error) throw error;
        } else {
            // Actualizar el registro existente para agregarle el groupId si no lo tenía
            const { error } = await supabase
                .from('journeys_shared')
                .update({
                    groupId: groupResult.groupId,
                    status: 'pending'
                })
                .eq('id', existingShare.id);

            if (error) throw error;
        }

        // Enviar notificación al amigo
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyJourneyInvitation(
            friend.user2Id,
            journeyData.description,
            userData.username,
            cityName,
            startDate,
            endDate,
            groupResult.invitationId,
            journeyId
        );

        Alert.alert('Éxito', `Se ha enviado una invitación de viaje a ${friend.username}. Se le notificará cuando acepte.`);
        return true;
    } catch (err) {
        console.error(err);
        Alert.alert('Error', 'No se pudo compartir el journey');
        return false;
    }
};

// Función para aceptar una invitación de viaje
export const acceptJourneyInvitation = async (
    journeyId: string,
    userId: string,
    groupInvitationId: string
): Promise<boolean> => {
    try {
        // Actualizar el estado en journeys_shared
        const { error: journeyShareError } = await supabase
            .from('journeys_shared')
            .update({ status: 'accepted' })
            .eq('journeyId', journeyId)
            .eq('sharedWithUserId', userId);

        if (journeyShareError) throw journeyShareError;

        // Aceptar la invitación al grupo desde el servicio de grupos
        const { error: memberError } = await supabase
            .from('group_members')
            .update({
                status: 'accepted',
                joined_at: new Date().toISOString()
            })
            .eq('id', groupInvitationId);

        if (memberError) throw memberError;

        return true;
    } catch (error) {
        console.error('Error al aceptar invitación de viaje:', error);
        return false;
    }
};

// Función para rechazar una invitación de viaje
export const rejectJourneyInvitation = async (
    journeyId: string,
    userId: string,
    groupInvitationId: string
): Promise<boolean> => {
    try {
        // Actualizar el estado en journeys_shared
        const { error: journeyShareError } = await supabase
            .from('journeys_shared')
            .update({ status: 'rejected' })
            .eq('journeyId', journeyId)
            .eq('sharedWithUserId', userId);

        if (journeyShareError) throw journeyShareError;

        // Rechazar la invitación al grupo
        const { error: memberError } = await supabase
            .from('group_members')
            .update({ status: 'rejected' })
            .eq('id', groupInvitationId);

        if (memberError) throw memberError;

        return true;
    } catch (error) {
        console.error('Error al rechazar invitación de viaje:', error);
        return false;
    }
}; 