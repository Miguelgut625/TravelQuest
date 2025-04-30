const { supabase } = require('../../services/supabase.server.js');

// Obtener todos los usuarios
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
const getUserById = async (req, res) => {
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

// Crear un nuevo usuario
const createUser = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Primero, registrar al usuario con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Luego, guardar información adicional en la tabla 'users'
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          id: authData.user.id,
          email,
          username,
          points: 0 // Iniciar con 0 puntos
        }
      ]);

    if (error) throw error;

    res.status(201).json({ message: 'Usuario creado con éxito', user: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
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
    // Primero eliminar de la tabla 'users'
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (usersError) throw usersError;

    // Luego eliminar el usuario de Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) throw authError;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ObtenerPuntuación
const obtenerPuntuacion = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener solicitudes pendientes
const obtenerSolicitudesPendientes = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', id)
      .eq('status', 'pending');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  obtenerPuntuacion, 
  obtenerSolicitudesPendientes 
};