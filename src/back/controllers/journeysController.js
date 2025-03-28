import { supabase } from '../../services/supabase.js';
// Obtener todos los viajes
 const getJourneys = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener un viaje por ID
 const getJourneyById = async (req,res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Crear un nuevo viaje****
 const createJourney = async (req,res) => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar un viaje****
 const updateJourney = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar un viaje
 const deleteJourney = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getJourneysByUserId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('userId', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { getJourneys, getJourneyById, createJourney, updateJourney, deleteJourney, getJourneysByUserId };