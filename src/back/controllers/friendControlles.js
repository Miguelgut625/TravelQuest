// friendControlles.js
import { supabase } from '../../services/supabase.js';

const obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const { id } = req.params;

    // Realiza la consulta para obtener todas las invitaciones pendientes
    const { data, error } = await supabase
      .from('friendship_invitations')
      .select('*') // Selecciona todas las columnas de la tabla
      .eq('senderId', id)
      .eq('status','Pending');

    // Si hay un error, lanza una excepción
    if (error) throw error;

    // Envía la respuesta con los datos obtenidos
    res.status(200).json(data);
  } catch (error) {
    // Maneja el error y responde con el mensaje de error
    res.status(400).json({ error: error.message });
  }
};

export default obtenerSolicitudesPendientes;
