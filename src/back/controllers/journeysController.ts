import { supabase } from '../../services/supabase';
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



/* //VESION MEJORADA
const createJourney = async (req, res) => {
  const { userId, cityName, description, start_date, end_date } = req.body;

  if (!userId || !cityName || !description || !start_date || !end_date) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // Buscar si la ciudad ya existe en la base de datos
    let { data: existingCity, error: cityError } = await supabase
      .from("cities")
      .select("id")
      .eq("name", cityName)
      .single();

    if (cityError && cityError.code !== "PGRST116") throw cityError; // Manejo de error diferente a "no encontrado"

    let cityId;

    if (!existingCity) {
      // Si la ciudad no existe, crearla
      const { data: newCity, error: newCityError } = await supabase
        .from("cities")
        .insert([{ name: cityName }])
        .select()
        .single();

      if (newCityError) throw newCityError;

      cityId = newCity.id;
    } else {
      cityId = existingCity.id;
    }

    // Crear el viaje con la ciudad encontrada o creada
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .insert([{ userId, cityId, description, start_date, end_date }])
      .select()
      .single();

    if (journeyError) throw journeyError;

    res.status(201).json({ message: "Viaje creado exitosamente", journey });
  } catch (error) {
    console.error("Error al crear el viaje:", error.message);
    res.status(500).json({ error: "Error al crear el viaje" });
  }
};*/


//Crear un nuevo viaje****
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