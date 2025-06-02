import { supabase } from './supabase';
import NotificationService from './NotificationService';
import { Alert, Platform } from 'react-native';
import { createJourneyGroup } from './groupService';

// Definir la interfaz Friend aquí ya que no se exporta desde FriendsScreen
export interface Friend {
    user2Id: string;
    username: string;
    points: number;
}

// Función para compartir un viaje con múltiples amigos
export const shareJourney = async (
    journeyId: string,
    ownerId: string,
    friends: Friend[] | Friend
): Promise<boolean> => {
    if (!journeyId) {
        Alert.alert('Error', 'No se pudo compartir el journey porque no se encontró el ID del viaje.');
        return false;
    }

    try {
        // Convertir a array si se recibe un solo amigo para mantener compatibilidad
        const friendsArray = Array.isArray(friends) ? friends : [friends];

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

        // Preparar fechas
        const startDate = new Date(journeyData.start_date);
        const endDate = new Date(journeyData.end_date);
        const cityName = journeyData.cities?.name || 'destino desconocido';

        // Crear un grupo para el viaje con todos los amigos
        const groupResult = await createJourneyGroup(
            journeyId,
            ownerId,
            friendsArray.map(friend => friend.user2Id),
            cityName,
            startDate,
            endDate
        );

        if (!groupResult.success) {
            throw new Error('No se pudo crear el grupo para el viaje');
        }

        // Procesar cada amigo
        let successCount = 0;
        for (const friend of friendsArray) {
            try {
                // Verificar si el viaje ya fue compartido con este amigo
                const { data: existingShare, error: existingShareError } = await supabase
                    .from('journeys_shared')
                    .select('id, status')
                    .eq('journeyId', journeyId)
                    .eq('sharedWithUserId', friend.user2Id)
                    .single();

                // Si ya existe y está aceptado, saltamos este amigo
                if (!existingShareError && existingShare && existingShare.status === 'accepted') {
                    console.log(`El viaje ya fue compartido con ${friend.username} anteriormente.`);
                    successCount++;
                    continue;
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
                            group_id: groupResult.groupId
                        });

                    if (error) throw error;
                } else {
                    // Actualizar el registro existente para agregarle el groupId si no lo tenía
                    const { error } = await supabase
                        .from('journeys_shared')
                        .update({
                            group_id: groupResult.groupId,
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
                    journeyId,
                    userData.username,
                    cityName,
                    startDate.toISOString(),
                    endDate.toISOString()
                );

                successCount++;
            } catch (friendError) {
                console.error(`Error al compartir con ${friend.username}:`, friendError);
                // Continuamos con el siguiente amigo aunque haya error con uno
            }
        }

        if (successCount === 0) {
            throw new Error('No se pudo compartir el viaje con ningún amigo');
        } else if (successCount < friendsArray.length) {
            Alert.alert('Información', `Se ha compartido el viaje con ${successCount} de ${friendsArray.length} amigos seleccionados.`);
        } else {
            const friendsText = friendsArray.length === 1
                ? friendsArray[0].username
                : `${friendsArray.length} amigos`;
            Alert.alert('Éxito', `Se ha enviado una invitación de viaje a ${friendsText}. Se te notificará cuando acepten.`);
        }

        return true;
    } catch (error) {
        console.error('Error al compartir viaje:', error);
        Alert.alert('Error', 'Ocurrió un error al compartir el viaje');
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

// Función para obtener los usuarios con los que se comparte un viaje
export const getJourneySharedUsers = async (journeyId: string, includeAllStatuses: boolean = true): Promise<any[]> => {
  try {
    // Prepara la consulta básica
    let query = supabase
      .from('journeys_shared')
      .select(`
        id,
        sharedWithUserId,
        status,
        users:sharedWithUserId (
          id,
          username,
          profile_pic_url
        )
      `)
      .eq('journeyId', journeyId);

    // Si solo queremos los aceptados, filtramos por estado
    if (!includeAllStatuses) {
      query = query.eq('status', 'accepted');
    }
    
    // Ejecutar la consulta
    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener usuarios compartidos:', error);
      return [];
    }

    // Filtrar usuarios válidos y formatear la respuesta
    const sharedUsers = data
      .filter(item => item.users)
      .map(item => ({
        id: item.users.id,
        username: item.users.username,
        avatarUrl: item.users.profile_pic_url,
        status: item.status
      }));

    return sharedUsers;
  } catch (error) {
    console.error('Error al obtener usuarios que comparten el viaje:', error);
    return [];
  }
};

// Función para verificar si un viaje es compartido o tiene invitaciones pendientes
export const isJourneyShared = async (journeyId: string, includeAllStatuses: boolean = true): Promise<boolean> => {
  try {
    // Prepara la consulta básica
    let query = supabase
      .from('journeys_shared')
      .select('id', { count: 'exact', head: true })
      .eq('journeyId', journeyId);

    // Si solo queremos los aceptados, filtramos por estado
    if (!includeAllStatuses) {
      query = query.eq('status', 'accepted');
    }
    
    // Ejecutar la consulta
    const { count, error } = await query;

    if (error) {
      console.error('Error al verificar si el viaje es compartido:', error);
      return false;
    }

    return count > 0;
  } catch (error) {
    console.error('Error al verificar si el viaje es compartido:', error);
    return false;
  }
}; 