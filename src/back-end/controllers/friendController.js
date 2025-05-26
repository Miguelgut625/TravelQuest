const { supabase } = require('../../services/supabase.server.js');

// Obtener todos los amigos de un usuario
const getFriends = async (req, res) => {
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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, points')
          .eq('id', friend.user2Id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          return null;
        }

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

    res.status(200).json(friendsDetails.filter((friend) => friend !== null));
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener solicitudes de amistad
const getFriendRequests = async (req, res) => {
  const { userId } = req.params;

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

    const processedReceivedRequests = receivedRequests.map((request) => ({
      id: request.id,
      senderId: request.senderId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'received'
    }));

    const processedSentRequests = sentRequests.map((request) => ({
      id: request.id,
      receiverId: request.receiverId,
      username: request.users.username,
      createdAt: request.created_at,
      type: 'sent'
    }));

    const allRequests = [...processedReceivedRequests, ...processedSentRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json(allRequests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(400).json({ error: error.message });
  }
};

// Enviar solicitud de amistad
const sendFriendRequest = async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    const { data: existingRequests, error: checkError } = await supabase
      .from('friendship_invitations')
      .select('id, status')
      .or(`and(senderId.eq.${senderId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${senderId})`)
      .in('status', ['Pending', 'accepted']);

    if (checkError) throw checkError;

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

    const { data: senderData, error: senderError } = await supabase
      .from('users')
      .select('username')
      .eq('id', senderId)
      .single();

    if (!senderError && senderData) {
      // Aquí se podría implementar la lógica de notificación
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Aceptar solicitud de amistad
const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.params;

  try {
    const { data: requestData, error: requestError } = await supabase
      .from('friendship_invitations')
      .select('senderId, receiverId')
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;

    const senderId = requestData.senderId;
    const receiverId = requestData.receiverId;

    const { error: updateError } = await supabase
      .from('friendship_invitations')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

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

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Rechazar solicitud de amistad
const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.params;

  try {
    const { error } = await supabase
      .from('friendship_invitations')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Eliminar amistad
const deleteFriendship = async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
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
    console.error('Error al eliminar la amistad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Cancelar solicitud de amistad
const cancelFriendRequest = async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const { error } = await supabase
      .from('friendship_invitations')
      .delete()
      .eq('senderId', senderId)
      .eq('receiverId', receiverId)
      .eq('status', 'Pending');

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al cancelar la solicitud:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Obtener amigos en común
const getMutualFriends = async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    const { data: user1FriendsAsUser1, error: user1Error } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId1);

    if (user1Error) throw user1Error;

    const { data: user1FriendsAsUser2, error: user1Error2 } = await supabase
      .from('friends')
      .select('user1Id')
      .eq('user2Id', userId1);

    if (user1Error2) throw user1Error2;

    const { data: user2FriendsAsUser1, error: user2Error } = await supabase
      .from('friends')
      .select('user2Id')
      .eq('user1Id', userId2);

    if (user2Error) throw user2Error;

    const { data: user2FriendsAsUser2, error: user2Error2 } = await supabase
      .from('friends')
      .select('user1Id')
      .eq('user2Id', userId2);

    if (user2Error2) throw user2Error2;

    const user1FriendIds = [
      ...user1FriendsAsUser1.map(f => f.user2Id),
      ...user1FriendsAsUser2.map(f => f.user1Id)
    ];
    
    const user2FriendIds = [
      ...user2FriendsAsUser1.map(f => f.user2Id),
      ...user2FriendsAsUser2.map(f => f.user1Id)
    ];

    const mutualFriendIds = user1FriendIds.filter(id => user2FriendIds.includes(id));

    if (mutualFriendIds.length === 0) {
      return res.status(200).json([]);
    }

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
    console.error('Error al obtener amigos en común:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  deleteFriendship,
  cancelFriendRequest,
  getMutualFriends
}; 