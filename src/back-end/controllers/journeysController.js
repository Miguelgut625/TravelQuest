const { supabase } = require('../../services/supabase.server.js');

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
const getJourneyById = async (req, res) => {
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

// Crear un nuevo viaje
const createJourney = async (req, res) => {
  const { title, description, start_date, end_date, user_id, city_id } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .insert([{ 
        title, 
        description, 
        start_date, 
        end_date, 
        user_id, 
        city_id,
        created_at: new Date().toISOString(),
        status: 'active'
      }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar un viaje
const updateJourney = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .update(updates)
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
    const { error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener viajes por userId
const getJourneysByUserId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        city:city_id (id, name, country, image_url)
      `)
      .eq('user_id', id)
      .order('start_date', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getJourneys,
  getJourneyById,
  createJourney,
  updateJourney,
  deleteJourney,
  getJourneysByUserId
};