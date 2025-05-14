const { supabase } = require('../../services/supabase.server.js');

// Obtener todas las misiones personales
const getJourneysMissions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journey_missions')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener una misión personal por ID
const getJourneysMissionsById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journey_missions')
      .select('*, challenge:challenge_id(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Crear una nueva misión personal
const createJourneysMissions = async (req, res) => {
  const { journey_id, challenge_id, user_id } = req.body;

  try {
    // Verificar que el desafío existe
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challenge_id)
      .single();

    if (challengeError) throw challengeError;
    if (!challenge) throw new Error('El desafío no existe');

    // Verificar que el viaje existe
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journey_id)
      .single();

    if (journeyError) throw journeyError;
    if (!journey) throw new Error('El viaje no existe');

    // Verificar que esta misión no haya sido ya asignada a este viaje
    const { data: existingMission, error: existingError } = await supabase
      .from('journey_missions')
      .select('*')
      .eq('journey_id', journey_id)
      .eq('challenge_id', challenge_id)
      .eq('user_id', user_id);

    if (existingError) throw existingError;
    if (existingMission && existingMission.length > 0) {
      return res.status(400).json({ error: 'Esta misión ya está asignada a este viaje' });
    }

    // Crear la misión personal
    const { data, error } = await supabase
      .from('journey_missions')
      .insert([{ 
        journey_id, 
        challenge_id, 
        user_id,
        completed: false,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una misión personal
const updateJourneysMissions = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('journey_missions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar una misión personal
const deleteJourneysMissions = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('journey_missions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener misiones personales por userId
const getJourneysMissionsByUserId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journey_missions')
      .select(`
        *,
        challenge:challenge_id(*),
        journey:journey_id(*, city:city_id(*))
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Marcar una misión como completada
const completeJourneysMissions = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Actualizar el estado de la misión a completada
    const { data: mission, error: missionError } = await supabase
      .from('journey_missions')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, challenge:challenge_id(*), user_id')
      .single();

    if (missionError) throw missionError;
    if (!mission) throw new Error('Misión no encontrada');

    // 2. Obtener los puntos del desafío
    const points = mission.challenge.points || 0;

    // 3. Actualizar los puntos del usuario
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        points: supabase.rpc('increment', { x: points }),
        updated_at: new Date().toISOString()
      })
      .eq('id', mission.user_id);

    if (userError) throw userError;

    res.status(200).json({ 
      message: 'Misión completada con éxito', 
      mission, 
      points_earned: points 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener misiones de un viaje
const getJourneysMissionsByJourneyId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journey_missions')
      .select(`
        *,
        challenge:challenge_id(*)
      `)
      .eq('journey_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getJourneysMissions,
  getJourneysMissionsById,
  createJourneysMissions,
  updateJourneysMissions,
  deleteJourneysMissions,
  getJourneysMissionsByUserId,
  completeJourneysMissions,
  getJourneysMissionsByJourneyId
};