import { supabase } from './supabase';

// Función para obtener todos los amigos de un usuario
export const getFriends = async (userId: string) => {
  try {
    const { data: friendData, error: friendError } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId);

    if (friendError) throw friendError;

    // Obtener detalles de cada amigo
    const friendsDetails = await Promise.all(
      friendData.map(async (friend: { user2Id: string }) => {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, points')
          .eq('id', friend.user2Id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          return null;
        }

        return {
          user2Id: friend.user2Id,
          username: userData.username,
          points: userData.points
        };
      })
    );

    // Filtrar los amigos que no se pudieron obtener
    return friendsDetails.filter((friend) => friend !== null);
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

// Función para obtener todas las solicitudes de amistad pendientes
export const getFriendRequests = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        created_at,
        users!friend_requests_sender_id_fkey (
          id,
          username
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw error;

    return data.map((request: any) => ({
      id: request.id,
      senderId: request.sender_id,
      username: request.users.username,
      createdAt: request.created_at
    }));
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
};

// Función para enviar una solicitud de amistad
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error };
  }
};

// Función para aceptar una solicitud de amistad
export const acceptFriendRequest = async (requestId: string) => {
  try {
    // 1. Obtener información de la solicitud
    const { data: requestData, error: requestError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;

    const senderId = requestData.sender_id;
    const receiverId = requestData.receiver_id;

    // 2. Iniciar una transacción para realizar todas las operaciones
    // Supabase no soporta transacciones directamente, así que hacemos las operaciones en secuencia

    // 3. Actualizar el estado de la solicitud a 'accepted'
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // 4. Crear relación de amistad bidireccional (A es amigo de B y B es amigo de A)
    // Primero: el remitente es amigo del receptor
    const { error: friendError1 } = await supabase
      .from('friends')
      .insert({
        user1Id: senderId,
        user2Id: receiverId
      });

    if (friendError1) throw friendError1;

    // Segundo: el receptor es amigo del remitente
    const { error: friendError2 } = await supabase
      .from('friends')
      .insert({
        user1Id: receiverId,
        user2Id: senderId
      });

    if (friendError2) throw friendError2;

    return { success: true };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, error };
  }
};

// Función para rechazar una solicitud de amistad
export const rejectFriendRequest = async (requestId: string) => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, error };
  }
}; 