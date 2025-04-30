import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';
// Obtener todas los usuarios
const getUsers = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener un usuario por ID
const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

interface CreateUserRequest {
  email: string;
  password: string;
  username: string;
}

const createUser = async (req: Request, res: Response) => {
  const { email, password, username } = req.body as CreateUserRequest;

  try {
    // Crear un nuevo usuario en Supabase
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (signupError) throw signupError;

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario');
    }

    // Insertar el usuario en la tabla 'users'
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          username,
          password,
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;

    res.status(201).json({
      message: 'Usuario creado exitosamente. Por favor, verifica tu correo electrónico.',
      user: { id: authData.user.id, email: authData.user.email, username }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

interface UpdateUserRequest {
  name?: string;
  description?: string;
}

// Actualizar un usuario
const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body as UpdateUserRequest;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar un usuario
const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener la puntuación de un usuario
const obtenerPuntuacion = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('id', id);
  
    if (error) throw error;
  
    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const obtenerSolicitudesPendientes = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    // Maneja el error y responde con el mensaje de error
    res.status(400).json({ error: error.message });
  }
};

// Iniciar sesión
const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Intentar iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      } else if (error.message.includes('User not allowed') || error.message.includes('Email not confirmed')) {
        return res.status(403).json({ 
          error: 'Necesitas verificar tu correo electrónico antes de iniciar sesión',
          needsVerification: true,
          email: email.trim()
        });
      } else {
        return res.status(400).json({ error: error.message });
      }
    }

    if (!data.user) {
      return res.status(404).json({ error: 'No se encontró el usuario' });
    }

    // Obtener datos adicionales del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('Error obteniendo datos del usuario:', userError);
    }

    // Responder con los datos del usuario y la sesión
    res.status(200).json({
      user: {
        email: data.user.email,
        id: data.user.id,
        username: userData?.username
      },
      session: data.session
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Reenviar email de verificación
const resendVerificationEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ 
      message: 'Se ha enviado un nuevo correo de verificación' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Enviar solicitud de recuperación de contraseña
const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ 
      message: 'Se ha enviado un código de recuperación a tu correo electrónico',
      email
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Verificar código OTP
const verifyCode = async (req: Request, res: Response) => {
  const { email, token } = req.body;

  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ 
      message: 'Código verificado correctamente' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Cambiar contraseña
const resetPassword = async (req: Request, res: Response) => {
  const { newPassword } = req.body;

  try {
    // Verificar la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return res.status(401).json({ error: 'Error al verificar la sesión' });
    }

    if (!session) {
      return res.status(401).json({ error: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión' });
    }

    // Actualizar la contraseña
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ 
      message: 'Tu contraseña ha sido actualizada correctamente' 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export { 
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  obtenerPuntuacion,
  obtenerSolicitudesPendientes,
  login,
  resendVerificationEmail,
  forgotPassword,
  verifyCode,
  resetPassword
};