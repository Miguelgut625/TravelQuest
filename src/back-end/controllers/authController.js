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

// Login de usuario
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor ingresa email y contraseña' });
  }

  try {
    console.log('Iniciando sesión para:', email);

    // Intentar iniciar sesión con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      console.error('Error de autenticación:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      } else if (error.message.includes('User not allowed') || error.message.includes('Email not confirmed')) {
        return res.status(403).json({ 
          error: 'Necesitas verificar tu correo electrónico antes de iniciar sesión',
          needsVerification: true 
        });
      } else {
        return res.status(400).json({ error: 'Error al iniciar sesión: ' + error.message });
      }
    }

    if (!data.user) {
      return res.status(404).json({ error: 'No se encontró el usuario' });
    }

    console.log('Login exitoso:', data.user.email);

    // Obtener datos adicionales del usuario
    console.log('Obteniendo datos del usuario con ID:', data.user.id);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('Error obteniendo datos del usuario:', userError);
    }

    console.log('Datos del usuario obtenidos de la tabla users:', userData);

    // Devolver información del usuario y token
    res.status(200).json({
      user: {
        email: data.user.email || '',
        id: data.user.id,
        username: userData?.username || 'Usuario'
      },
      token: data.session.access_token
    });

  } catch (error) {
    console.error('Error inesperado durante el login:', error);
    res.status(500).json({ error: 'Ocurrió un error inesperado' });
  }
};

// Reenviar correo de verificación
const resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Se requiere el correo electrónico' });
  }

  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim()
    });

    if (error) {
      console.error('Error al reenviar verificación:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Correo de verificación enviado con éxito' });
  } catch (error) {
    console.error('Error inesperado al reenviar verificación:', error);
    res.status(500).json({ error: 'Ocurrió un error inesperado' });
  }
};

module.exports = { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  obtenerPuntuacion, 
  obtenerSolicitudesPendientes,
  login,
  resendVerification
};