// friendControlles.js
const { supabase } = require('../../services/supabase.server.js');

// Función para generar ID único
const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Obtener solicitudes pendientes para un usuario
const obtenerSolicitudesPendientes = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, sender:sender_id(*)')
      .eq('receiver_id', id)
      .eq('status', 'pending');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Aceptar una solicitud de amistad
const aceptarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener la solicitud de amistad
    const { data: requestData, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError) throw requestError;
    if (!requestData) throw new Error('Solicitud no encontrada');

    const { sender_id, receiver_id } = requestData;

    // 2. Actualizar el estado de la solicitud a 'accepted'
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Crear dos registros en la tabla 'friends'
    const { error: friendError } = await supabase
      .from('friends')
      .insert([
        { id: generateUniqueId(), user_id: sender_id, friend_id: receiver_id },
        { id: generateUniqueId(), user_id: receiver_id, friend_id: sender_id }
      ]);

    if (friendError) throw friendError;

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
      .from('friend_requests')
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
  const { sender_id, receiver_id } = req.body;

  try {
    // Verificar si ya existe una solicitud pendiente entre estos usuarios
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .eq('status', 'pending');

    if (checkError) throw checkError;

    if (existingRequest && existingRequest.length > 0) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente entre estos usuarios' });
    }

    // Verificar si ya son amigos
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', sender_id)
      .eq('friend_id', receiver_id);

    if (friendshipError) throw friendshipError;

    if (existingFriendship && existingFriendship.length > 0) {
      return res.status(400).json({ error: 'Estos usuarios ya son amigos' });
    }

    // Crear la solicitud
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([
        { 
          id: generateUniqueId(),
          sender_id, 
          receiver_id, 
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    res.status(201).json({ message: 'Solicitud enviada con éxito', request: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud,
  enviarSolicitud
};
