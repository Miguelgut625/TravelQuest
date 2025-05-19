import { supabase } from './supabase';
import NotificationService from './NotificationService';

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
        // Obtener datos del usuario
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, points, avatar_url')
          .eq('id', friend.user2Id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          return null;
        }

        // Obtener el rango del usuario desde la tabla de leaderboard
        const { data: rankData, error: rankError } = await supabase
          .from('leaderboard')
          .select('rank')
          .eq('userId', friend.user2Id)
          .single();

        return {
          user2Id: friend.user2Id,
          username: userData.username,
          points: userData.points,
          avatarUrl: userData.avatar_url,
          rankIndex: rankError ? undefined : rankData.rank
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
    // Obtener solicitudes recibidas
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friendship_invitations')
      .select(`
        id,
        "senderId",
        created_at,
        users!friendship_invitations_senderId_fkey (
          id,
          username
        )
      `)
      .eq('receiverId', userId)
      .eq('status', 'Pending');

    if (receivedError) throw receivedError;

    // Obtener solicitudes enviadas
    const { data: sentRequests, error: sentError } = await supabase
      .from('friendship_invitations')
      .select(`
        id,
        "receiverId",
        created_at,
        users!friendship_invitations_receiverId_fkey (
          id,
          username
        )
      `)
      .eq('senderId', userId)
      .eq('status', 'Pending');

    if (sentError) throw sentError;

    // Procesar solicitudes recibidas
    const processedReceivedRequests = receivedRequests.map((request: any) => ({
      id: request.id,
      senderId: request.senderId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'received'
    }));

    // Procesar solicitudes enviadas
    const processedSentRequests = sentRequests.map((request: any) => ({
      id: request.id,
      receiverId: request.receiverId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'sent'
    }));

    // Combinar y ordenar todas las solicitudes por fecha
    const allRequests = [...processedReceivedRequests, ...processedSentRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allRequests;
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
};

// Función para enviar una solicitud de amistad
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    // Verificar si ya existe una solicitud pendiente
    const { data: existingRequests, error: checkError } = await supabase
      .from('friendship_invitations')
      .select('id, status')
      .or(`and(senderId.eq.${senderId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${senderId})`)
      .in('status', ['Pending', 'accepted']);

    if (checkError) throw checkError;

    // Verificar si hay alguna solicitud pendiente o aceptada
    const pendingRequest = existingRequests?.find(req => req.status === 'Pending');
    const acceptedRequest = existingRequests?.find(req => req.status === 'accepted');

    if (pendingRequest) {
      return {
        success: false,
        error: 'Ya existe una solicitud de amistad pendiente con este usuario'
      };
    }

    if (acceptedRequest) {
      return {
        success: false,
        error: 'Ya son amigos con este usuario'
      };
    }

    const { data, error } = await supabase
      .from('friendship_invitations')
      .insert({
        senderId: senderId,
        receiverId: receiverId,
        status: 'Pending'
      });

    if (error) throw error;

    // Obtener el nombre del usuario que envía la solicitud para la notificación
    const { data: senderData, error: senderError } = await supabase
      .from('users')
      .select('username')
      .eq('id', senderId)
      .single();

    if (!senderError && senderData) {
      // Enviar notificación al receptor
      const notificationService = NotificationService.getInstance();
      await notificationService.notifyFriendRequest(
        receiverId,
        senderId,
        senderData.username
      );
    }

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
      .from('friendship_invitations')
      .select('senderId, receiverId')
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;

    const senderId = requestData.senderId;
    const receiverId = requestData.receiverId;

    // 2. Iniciar una transacción para realizar todas las operaciones
    // Supabase no soporta transacciones directamente, así que hacemos las operaciones en secuencia

    // 3. Actualizar el estado de la solicitud a 'accepted'
    const { error: updateError } = await supabase
      .from('friendship_invitations')
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
      .from('friendship_invitations')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, error };
  }
};

// Función para eliminar una relación de amistad
export const deleteFriendship = async (userId1: string, userId2: string) => {
  try {
    // Eliminar la relación en ambas direcciones
    const { error: error1 } = await supabase
      .from('friends')
      .delete()
      .eq('user1Id', userId1)
      .eq('user2Id', userId2);

    if (error1) throw error1;

    const { error: error2 } = await supabase
      .from('friends')
      .delete()
      .eq('user1Id', userId2)
      .eq('user2Id', userId1);

    if (error2) throw error2;

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar la amistad:', error);
    return { success: false, error };
  }
};

export const cancelFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    const { error } = await supabase
      .from('friendship_invitations')
      .delete()
      .eq('senderId', senderId)
      .eq('receiverId', receiverId)
      .eq('status', 'Pending');

    if (error) {
      console.error('Error al cancelar la solicitud:', error);
      return { success: false, error: 'No se pudo cancelar la solicitud de amistad' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al cancelar la solicitud:', error);
    return { success: false, error: 'No se pudo cancelar la solicitud de amistad' };
  }
};

// Función para obtener amigos en común entre dos usuarios
export const getMutualFriends = async (userId1: string, userId2: string) => {
  try {
    // Obtener amigos del primer usuario (donde es user1Id)
    const { data: user1FriendsAsUser1, error: user1Error } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId1);

    if (user1Error) throw user1Error;

    // Obtener amigos del primer usuario (donde es user2Id)
    const { data: user1FriendsAsUser2, error: user1Error2 } = await supabase
      .from('friends')
      .select('user1Id')
      .eq('user2Id', userId1);

    if (user1Error2) throw user1Error2;

    // Obtener amigos del segundo usuario (donde es user1Id)
    const { data: user2FriendsAsUser1, error: user2Error } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId2);

    if (user2Error) throw user2Error;

    // Obtener amigos del segundo usuario (donde es user2Id)
    const { data: user2FriendsAsUser2, error: user2Error2 } = await supabase
      .from('friends')
      .select('user1Id')
      .eq('user2Id', userId2);

    if (user2Error2) throw user2Error2;

    // Combinar los IDs de amigos de ambos usuarios
    const user1FriendIds = [
      ...user1FriendsAsUser1.map(f => f.user2Id),
      ...user1FriendsAsUser2.map(f => f.user1Id)
    ];
    
    const user2FriendIds = [
      ...user2FriendsAsUser1.map(f => f.user2Id),
      ...user2FriendsAsUser2.map(f => f.user1Id)
    ];

    // Encontrar IDs de amigos en común
    const mutualFriendIds = user1FriendIds.filter(id => user2FriendIds.includes(id));

    if (mutualFriendIds.length === 0) return [];

    // Obtener detalles de los amigos en común
    const { data: mutualFriendsData, error: mutualError } = await supabase
      .from('users')
      .select('id, username, points, profile_pic_url')
      .in('id', mutualFriendIds);

    if (mutualError) throw mutualError;

    return mutualFriendsData.map(friend => ({
      user2Id: friend.id,
      username: friend.username,
      points: friend.points,
      profilePicUrl: friend.profile_pic_url
    }));
  } catch (error) {
    console.error('Error al obtener amigos en común:', error);
    return [];
  }
}; 