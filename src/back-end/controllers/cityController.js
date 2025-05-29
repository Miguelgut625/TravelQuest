const { supabase } = require('../../services/supabase.server.js');

// Obtener todas las ciudades
const getCities = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener ciudades:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener una ciudad por ID
const getCityById = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ciudad' });
  }
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Ciudad no encontrada' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener ciudad:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener ciudades por país
const getCitiesByCountry = async (req, res) => {
  const { countryId } = req.params;
  
  if (!countryId) {
    return res.status(400).json({ error: 'Se requiere el ID del país' });
  }
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener ciudades del país:', error);
    res.status(400).json({ error: error.message });
  }
};

// Buscar ciudades
const searchCities = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
  }
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al buscar ciudades:', error);
    res.status(400).json({ error: error.message });
  }
};

// Crear una nueva ciudad
const createCity = async (req, res) => {
  const { name, country_id } = req.body;
  
  if (!name || !country_id) {
    return res.status(400).json({ error: 'Se requieren nombre y país' });
  }
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .insert([{
        name,
        country_id
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error al crear ciudad:', error);
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una ciudad
const updateCity = async (req, res) => {
  const { id } = req.params;
  const { name, country_id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ciudad' });
  }
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .update({
        name,
        country_id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Ciudad no encontrada' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al actualizar ciudad:', error);
    res.status(400).json({ error: error.message });
  }
};

// Eliminar una ciudad
const deleteCity = async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la ciudad' });
  }
  
  try {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar ciudad:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getCities,
  getCityById,
  getCitiesByCountry,
  searchCities,
  createCity,
  updateCity,
  deleteCity
};