import e from 'express';
import { supabase } from '../../services/supabase';
// Obtener todas los usuarios
 const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener un usuario por ID
 const getUserById = async (req,res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Crear un nuevo usuario en Supabase
    const { user, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) throw signupError;

    // Insertar el usuario en la tabla 'users' incluyendo la contraseña
    const { data, error: insertError } = await supabase
      .from('users')
      .insert([{ email, username, password }]);

    if (insertError) throw insertError;

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: user?.id, email: user?.email, username, password },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar un usuario****
 const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Eliminar un usuario
 const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Obtener la puntuación de un usuario
const obtenerPuntuacion = async (req, res) => {
    const { id } = req.params;
  
    try {
      const { data, error } = await supabase
        .from('users')
        .select('points')
        .eq('id', id);
  
      if (error) throw error;
  
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  const obtenerSolicitudesPendientes = async (req, res) => {
    try {
      const { id } = req.params;

      // Realiza la consulta para obtener todas las invitaciones pendientes
      const { data, error } = await supabase
        .from('friendship_invitations')
        .select('*') // Selecciona todas las columnas de la tabla
        .eq('receiverId', id)
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

  
  



export { getUsers,
   getUserById,
    createUser,
     updateUser,
      deleteUser,
       obtenerPuntuacion,
       obtenerSolicitudesPendientes };