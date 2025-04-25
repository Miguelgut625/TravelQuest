import { supabase } from '../../services/supabase';
import { getChallengesPoints } from './challengesController.js';
// Obtener todas las misiones
 const getJourneysMissions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// Obtener una misión por ID
 const getJourneysMissionsById = async (req,res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
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
 const createJourneysMissions = async (req,res) => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una misión****
 const updateJourneysMissions = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Completar una misión y suma puntuación a ese usuario
const completeJourneysMissions = async (req, res) => {
    const { id } = req.params; // id de la misión en la tabla journeys_missions
  
    try {
      // Paso 1: Obtener los detalles de la misión (journeyId y challengeId)
      const { data: journeyMissionData, error: journeyMissionError } = await supabase
        .from('journeys_missions')
        .select('journeyId, challengeId')
        .eq('id', id)
        .single(); // Obtener una sola fila
  
      if (journeyMissionError) throw journeyMissionError;
  
      const { journeyId, challengeId } = journeyMissionData;
  
      // Paso 2: Obtener el userId desde la tabla viajes usando el journeyId
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('userId')
        .eq('id', journeyId)
        .single(); // Obtener una sola fila
  
      if (journeyError) throw journeyError;
  
      const { userId } = journeyData;
  
      // Paso 3: Obtener los puntos de la misión (challenge)
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('points')
        .eq('id', challengeId)
        .single(); // Obtener solo un resultado
  
      if (challengeError) throw challengeError;
  
      const pointsToAdd = challengeData.points;
  
      // Paso 4: Completar la misión en journeys_missions
      const { data: missionData, error: missionError } = await supabase
        .from('journeys_missions')
        .update({ completed: true })
        .eq('id', id);
  
      if (missionError) throw missionError;
  
      // Paso 5: Obtener los puntos actuales del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .single();
  
      if (userError) throw userError;
  
      // Sumar los puntos
      const newPoints = userData.points + pointsToAdd;
  
      // Paso 6: Actualizar los puntos del usuario
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', userId);
  
      if (updateUserError) throw updateUserError;
  
      // Responder con éxito
      res.status(200).json({
        message: 'Misión completada y puntos añadidos al usuario',
        missionData,
        updatedUserPoints: newPoints,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  
// Eliminar una misión
 const deleteJourneysMissions = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Obtener las misiones de un viaje con detalles de challenge y city

//Devuelve todo los datos de ese viaje, las misiones y la tabla intermedia journeys_missions,
//hay que hacer un join entre las tablas journeys_missions, challenges y cities y sacar solo 
//los datos necesarios de cada tabla.
const getJourneysMissionsByJourneyId = async (req, res) => {
    const { id } = req.params; // journeyId desde los parámetros de la ruta
    
    try {
      // Paso 1: Obtener las misiones asociadas al journeyId
      const { data: missionsData, error: missionsError } = await supabase
        .from('journeys_missions') // Tabla journeys_missions
        .select('*') // Seleccionar todas las columnas
        .eq('journeyId', id); // Filtrar por journeyId
      
      if (missionsError) throw missionsError; // Si hay error, lanzarlo
  
      // Paso 2: Obtener los detalles del viaje (description, start_date, end_date)
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys') // Tabla viajes
        .select('description, start_date, end_date, cityId') // Seleccionar los detalles del viaje
        .eq('id', id) // Filtrar por journeyId (id)
        .single(); // Solo una fila
      
      if (journeyError) throw journeyError; // Si hay error, lanzarlo
  
      // Paso 3: Obtener el nombre de la ciudad usando el cityId del viaje
      const { data: cityData, error: cityError } = await supabase
        .from('cities') // Tabla cities
        .select('name') // Seleccionar el nombre de la ciudad
        .eq('id', journeyData.cityId) // Filtrar por cityId
        .single(); // Solo una fila
      
      if (cityError) throw cityError; // Si hay error, lanzarlo
  
      // Paso 4: Obtener los detalles del challenge para cada misión
      const missionsWithDetails = await Promise.all(missionsData.map(async (mission) => {
        // Para cada misión, obtenemos los detalles del challenge
        const { data: challengeData, error: challengeError } = await supabase
          .from('challenges') // Tabla challenges
          .select('points, description, title, difficulty') // Obtener detalles del challenge
          .eq('id', mission.challengeId) // Filtrar por challengeId
          .single(); // Solo una fila
        
        if (challengeError) throw challengeError; // Si hay error, lanzarlo
  
        // Agregar los detalles del challenge a la misión
        return {
          ...mission, // Datos de la misión
          challenge: challengeData, // Datos del challenge
        };
      }));
  
      // Paso 5: Incluir los detalles del viaje con las misiones y la ciudad
      const response = {
        journey: {
          ...journeyData, // Información del viaje
          cityName: cityData.name, // Nombre de la ciudad
        },
        missions: missionsWithDetails, // Misiones con los detalles de challenge
      };
  
      // Paso 6: Devolver la respuesta con la información completa
      res.status(200).json(response); // Responder con los detalles del viaje, la ciudad y las misiones
    } catch (error) {
      res.status(400).json({ error: error.message }); // Devolver el error si ocurre
    }
  };
  
  
  const getJourneysMissionsByUserId = async (req, res) => {
    const { id } = req.params; // El id es el userId
  
    try {
        // Paso 1: Obtener todos los journeyIds que están asociados con este userId desde la tabla viajes
        const { data: journeyData, error: journeyError } = await supabase
            .from('journeys') // Tabla viajes
            .select('id') // Obtener los journeyIds (id)
            .eq('userId', id); // Filtrar por el userId
  
        if (journeyError) throw journeyError;
  
        // Paso 2: Si no se encuentra ningún viaje para este usuario
        if (journeyData.length === 0) {
            return res.status(404).json({ message: "No journeys found for this user." });
        }
  
        // Paso 3: Obtener todos los journeyIds
        const journeyIds = journeyData.map(journey => journey.id);
  
        // Paso 4: Obtener las misiones relacionadas con estos journeyIds, incluyendo los detalles de los viajes, desafíos y usuarios
        const { data: missionsData, error: missionsError } = await supabase
            .from('journeys_missions') // Tabla journeys_missions
            .select(`
                *,
                journeys (
                    description
                ),
                challenges (
                    title,
                    description
                ),
                user:users (
                    username
                )
            `)
            .in('journeyId', journeyIds); // Filtrar por journeyIds
  
        if (missionsError) throw missionsError;
  
        // Paso 5: Responder con las misiones encontradas
        res.status(200).json(missionsData);
  
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

  

export { getJourneysMissions,
     getJourneysMissionsById, 
     createJourneysMissions, 
     updateJourneysMissions,
     deleteJourneysMissions,
     getJourneysMissionsByJourneyId,
     getJourneysMissionsByUserId,
     completeJourneysMissions};