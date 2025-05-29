const { supabase } = require('../../services/supabase.server.js');

// Obtener un viaje por ID
const getJourneyById = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID del viaje' });
  }
  
  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener viaje:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener viajes por usuario
const getJourneysByUser = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    res.status(400).json({ error: error.message });
  }
};

// Crear un nuevo viaje
const createJourney = async (req, res) => {
  const { user_id, city_id, start_date, end_date, description } = req.body;
  
  if (!user_id || !city_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Se requieren user_id, city_id, start_date y end_date' });
  }
  
  try {
    const { data, error } = await supabase
      .from('journeys')
      .insert([{
        user_id,
        city_id,
        start_date,
        end_date,
        description,
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error al crear viaje:', error);
    res.status(400).json({ error: error.message });
  }
};

// Actualizar un viaje
const updateJourney = async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date, description, status } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID del viaje' });
  }
  
  try {
    const { data, error } = await supabase
      .from('journeys')
      .update({
        start_date,
        end_date,
        description,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    res.status(400).json({ error: error.message });
  }
};

// Eliminar un viaje
const deleteJourney = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID del viaje' });
  }
  
  try {
    const { error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar viaje:', error);
    res.status(400).json({ error: error.message });
  }
};

// Compartir un viaje
const shareJourney = async (req, res) => {
  const { id } = req.params;
  const { userId, friends } = req.body;
  
  if (!id || !userId || !friends) {
    return res.status(400).json({ error: 'Se requieren ID del viaje, ID del usuario y lista de amigos' });
  }
  
  try {
    // Verificar si el viaje existe
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, city, start_date, end_date')
      .eq('id', id)
      .single();

    if (journeyError) throw journeyError;
    
    if (!journey) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    // Convertir friends a array si es un solo amigo
    const friendsArray = Array.isArray(friends) ? friends : [friends];
    
    // Compartir el viaje con cada amigo
    const sharedJourneys = friendsArray.map(friend => ({
      journeyId: id,
      ownerId: userId,
      sharedWithUserId: friend.user2Id,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('journeys_shared')
      .insert(sharedJourneys)
      .select();

    if (error) throw error;
    
    res.status(201).json({
      message: 'Viaje compartido exitosamente',
      sharedJourneys: data
    });
  } catch (error) {
    console.error('Error al compartir viaje:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getJourneyById,
  getJourneysByUser,
  createJourney,
  updateJourney,
  deleteJourney,
  shareJourney
}; 