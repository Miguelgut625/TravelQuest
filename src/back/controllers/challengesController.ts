import { supabase } from '../../services/supabase.js';
// Obtener todas las misiones
 const getChallenges = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Obtener puntuacion de la mision
const getChallengesPoints = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('points')
      .eq('id', id);

    if (error) throw error; 

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// Obtener una misión por ID
 const getChallengeById = async (req,res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Crear una nueva misión****
 const createChallenge = async (req,res) => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una misión****
 const updateChallenge = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar una misión
 const deleteChallenge = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



export { getChallenges,
     getChallengeById, 
     createChallenge, 
     updateChallenge,
     deleteChallenge,
     getChallengesPoints };