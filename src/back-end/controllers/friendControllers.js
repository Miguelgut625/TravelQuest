const { supabase } = require('../../services/supabase.server.js');

// Función para generar ID único
const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Obtener solicitudes pendientes para un usuario
const obtenerSolicitudesPendientes = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener solicitudes recibidas
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friendship_invitations')
      .select(`
        id,
        senderId,
        created_at,
        users!friendship_invitations_senderId_fkey (
          id,
          username
        )
      `)
      .eq('receiverId', id)
      .eq('status', 'Pending');

    if (receivedError) throw receivedError;

    // Obtener solicitudes enviadas
    const { data: sentRequests, error: sentError } = await supabase
      .from('friendship_invitations')
      .select(`
        id,
        receiverId,
        created_at,
        users!friendship_invitations_receiverId_fkey (
          id,
          username
        )
      `)
      .eq('senderId', id)
      .eq('status', 'Pending');

    if (sentError) throw sentError;

    // Procesar solicitudes recibidas
    const processedReceivedRequests = receivedRequests.map(request => ({
      id: request.id,
      senderId: request.senderId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'received'
    }));

    // Procesar solicitudes enviadas
    const processedSentRequests = sentRequests.map(request => ({
      id: request.id,
      receiverId: request.receiverId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'sent'
    }));

    // Combinar y ordenar todas las solicitudes por fecha
    const allRequests = [...processedReceivedRequests, ...processedSentRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json(allRequests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener amigos de un usuario
const obtenerAmigos = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: friendData, error: friendError } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId);

    if (friendError) throw friendError;

    // Obtener detalles de cada amigo
    const friendsDetails = await Promise.all(
      friendData.map(async (friend) => {
        // Obtener datos del usuario
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, points')
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
          rankIndex: rankError ? undefined : rankData.rank
        };
      })
    );

    // Filtrar los amigos que no se pudieron obtener
    const validFriends = friendsDetails.filter(friend => friend !== null);
    res.status(200).json(validFriends);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener amigos en común entre dos usuarios
const obtenerAmigosEnComun = async (req, res) => {
  const { userId1, userId2 } = req.params;

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

    if (mutualFriendIds.length === 0) {
      return res.status(200).json([]);
    }

    // Obtener detalles de los amigos en común
    const { data: mutualFriendsData, error: mutualError } = await supabase
      .from('users')
      .select('id, username, points, profile_pic_url')
      .in('id', mutualFriendIds);

    if (mutualError) throw mutualError;

    const mutualFriends = mutualFriendsData.map(friend => ({
      user2Id: friend.id,
      username: friend.username,
      points: friend.points,
      profilePicUrl: friend.profile_pic_url
    }));

    res.status(200).json(mutualFriends);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener ranking de un amigo
const obtenerRankingAmigo = async (req, res) => {
  const { friendId } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .order('points', { ascending: false });

    if (error) throw error;

    const index = data.findIndex(user => user.id === friendId);
    res.status(200).json({ rankIndex: index !== -1 ? index : undefined });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Aceptar una solicitud de amistad
const aceptarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener información de la solicitud
    const { data: requestData, error: requestError } = await supabase
      .from('friendship_invitations')
      .select('senderId, receiverId')
      .eq('id', id)
      .single();

    if (requestError) throw requestError;
    if (!requestData) throw new Error('Solicitud no encontrada');

    const { senderId, receiverId } = requestData;

    // 2. Actualizar el estado de la solicitud a 'accepted'
    const { error: updateError } = await supabase
      .from('friendship_invitations')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Crear relación de amistad bidireccional
    const { error: friendError1 } = await supabase
      .from('friends')
      .insert({
        user1Id: senderId,
        user2Id: receiverId
      });

    if (friendError1) throw friendError1;

    const { error: friendError2 } = await supabase
      .from('friends')
      .insert({
        user1Id: receiverId,
        user2Id: senderId
      });

    if (friendError2) throw friendError2;

    res.status(200).json({ message: 'Solicitud aceptada con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Rechazar una solicitud de amistad
const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('friendship_invitations')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Solicitud rechazada con éxito' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Enviar una solicitud de amistad
const enviarSolicitud = async (req, res) => {
  const { senderId, receiverId } = req.body;

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
      return res.status(400).json({
        success: false,
        error: 'Ya existe una solicitud de amistad pendiente con este usuario'
      });
    }

    if (acceptedRequest) {
      return res.status(400).json({
        success: false,
        error: 'Ya son amigos con este usuario'
      });
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
      // Aquí se podría agregar la lógica para enviar notificación
      // await notificationService.notifyFriendRequest(receiverId, senderId, senderData.username);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Eliminar una relación de amistad
const eliminarAmistad = async (req, res) => {
  const { userId1, userId2 } = req.params;

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

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Cancelar una solicitud de amistad
const cancelarSolicitud = async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const { error } = await supabase
      .from('friendship_invitations')
      .delete()
      .eq('senderId', senderId)
      .eq('receiverId', receiverId)
      .eq('status', 'Pending');

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud,
  enviarSolicitud,
  obtenerAmigos,
  obtenerAmigosEnComun,
  eliminarAmistad,
  cancelarSolicitud,
  obtenerRankingAmigo
}; 