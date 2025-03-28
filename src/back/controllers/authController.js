import { supabase } from '../../services/supabase.js';
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

// Crear un nuevo usuario****
 const createUser = async (req,res) => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
        .from('users')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
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




export { getUsers, getUserById, createUser, updateUser, deleteUser, obtenerPuntuacion };