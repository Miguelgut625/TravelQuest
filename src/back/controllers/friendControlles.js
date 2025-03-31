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

    // Primero, obtenemos la solicitud de amistad para obtener senderId y receiverId
    const { data: invitation, error: invitationError } = await supabase
      .from('friendship_invitations')
      .select('senderId, receiverId')
      .eq('id', id)
      .single(); // Solo debe haber un registro

    // Si hay un error obteniendo la solicitud de amistad, lanza una excepción
    if (invitationError) throw invitationError;

    const { senderId, receiverId } = invitation;

    // Actualiza el campo status a "Accepted" en la tabla 'friendship_invitations'
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('friendship_invitations')
      .update({ status: 'Accepted' })
      .eq('id', id)
      .single();  // Solo debe haber un registro actualizado

    // Si hay un error actualizando la solicitud de amistad, lanza una excepción
    if (updateError) throw updateError;

    // Ahora, inserta una nueva fila en la tabla 'friends' con los valores senderId y receiverId
    const { data: newFriendship, error: insertError } = await supabase
      .from('friends')
      .insert([
        {
          user1Id: senderId,
          user2Id: receiverId
        }
      ])
      .single();  // Solo debe haber un registro insertado

    // Si hay un error insertando la relación de amistad, lanza una excepción
    if (insertError) throw insertError;

    // Devuelve los datos actualizados y la nueva amistad
    res.status(200).json({ updatedInvitation, newFriendship });
  } catch (error) {
    // Maneja el error y responde con el mensaje de error
    res.status(400).json({ error: error.message });
  }
};



export  {
  obtenerSolicitudesPendientes,
  aceptarSolicitud};
