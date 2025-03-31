// friendControlles.js
import { supabase } from '../../services/supabase.js';

const obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
    .from('friendship_invitations')
    .select(`
      id,
      created_at,
      senderId,
      receiverId,
      status,
      sender:senderId (username)`)
    .eq('receiverId', id) // Filtrar por receiverId
    .eq('status', 'Pending'); // Filtrar por estado "Pending"

    // Si hay un error, lanza una excepción
    if (error) throw error;

    // Envía la respuesta con los datos obtenidos
    res.status(200).json(data);
  } catch (error) {
    // Maneja el error y responde con el mensaje de error
    res.status(400).json({ error: error.message });
  }
};

const aceptarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la solicitud de amistad
    const { data: invitation, error: invitationError } = await supabase
      .from('friendship_invitations')
      .select('senderId, receiverId')
      .eq('id', id)
      .single();

    if (invitationError) throw invitationError;

    const { senderId, receiverId } = invitation;

    // Actualizar el estado a "Accepted"
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('friendship_invitations')
      .update({ status: 'Accepted' })
      .eq('id', id)
      .single();

    if (updateError) throw updateError;

    // Insertar en la tabla 'friends'
    const { data: newFriendship, error: insertError } = await supabase
      .from('friends')
      .insert([{ user1Id: senderId, user2Id: receiverId }])
      .single();

    if (insertError) throw insertError;

    res.status(200).json({ updatedInvitation, newFriendship });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    // Actualizar el estado a "Rejected"
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('friendship_invitations')
      .update({ status: 'Rejected' })
      .eq('id', id)
      .single();  

    if (updateError) throw updateError;

    res.status(200).json({ updatedInvitation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


export {
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud
};
