const { supabase } = require('../../services/supabase.server.js');

// Obtener una ruta por ID
const getRouteById = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ruta' });
  }
  
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener ruta:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener rutas por viaje
const getRoutesByJourney = async (req, res) => {
  const { journeyId } = req.params;
  
  if (!journeyId) {
    return res.status(400).json({ error: 'Se requiere el ID del viaje' });
  }
  
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('journey_id', journeyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    res.status(400).json({ error: error.message });
  }
};

// Crear una nueva ruta
const createRoute = async (req, res) => {
  const { journey_id, name, description } = req.body;
  
  if (!journey_id || !name) {
    return res.status(400).json({ error: 'Se requieren journey_id y nombre' });
  }
  
  try {
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        journey_id,
        name,
        description,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una ruta
const updateRoute = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ruta' });
  }
  
  try {
    const { data, error } = await supabase
      .from('routes')
      .update({
        name,
        description
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al actualizar ruta:', error);
    res.status(400).json({ error: error.message });
  }
};

// Eliminar una ruta
const deleteRoute = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ruta' });
  }
  
  try {
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar ruta:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getRouteById,
  getRoutesByJourney,
  createRoute,
  updateRoute,
  deleteRoute
}; 