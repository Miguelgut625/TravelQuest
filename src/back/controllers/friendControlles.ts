// friendControlles.ts
import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';

interface SolicitudRequest {
  senderId: string;
  username: string;
}

const enviarSolicitud = async (req: Request, res: Response) => {
  try {
    const { senderId, username } = req.body as SolicitudRequest;

    // Obtener el receiverId a partir del username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError) throw userError;

    const receiverId = user.id;

    // Verificar que no se está enviando una solicitud a sí mismo
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });
    }

    // Verificar si ya son amigos (comprobando ambas direcciones)
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user1Id.eq.${senderId},user2Id.eq.${receiverId}),and(user1Id.eq.${receiverId},user2Id.eq.${senderId})`)
      .single();

    if (friends) {
      return res.status(400).json({ error: 'Ya son amigos' });
    }

    // Verificar si ya existe una solicitud pendiente en cualquier dirección
    const { data: existingRequest, error: requestError } = await supabase
      .from('friendship_invitations')
      .select('*')
      .or(`and(senderId.eq.${senderId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${senderId})`)
      .eq('status', 'Pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente entre estos usuarios' });
    }

    // Enviar la solicitud de amistad
    const { data, error } = await supabase
      .from('friendship_invitations')
      .insert([{ senderId, receiverId }])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};  

const obtenerSolicitudesPendientes = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    // Maneja el error y responde con el mensaje de error
    res.status(400).json({ error: error.message });
  }
};

const aceptarSolicitud = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const rechazarSolicitud = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export {
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud,
  enviarSolicitud
};
