import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';
import { getChallengesPoints } from './challengesController';

// Obtener todas las misiones
const getJourneysMissions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .select('*');

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Obtener una misión por ID
const getJourneysMissionsById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Crear una nueva misión
const createJourneysMissions = async (req: Request, res: Response): Promise<Response> => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .insert([{ name, description }]);

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Actualizar una misión
const updateJourneysMissions = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Completar una misión y suma puntuación a ese usuario
const completeJourneysMissions = async (req: Request, res: Response): Promise<Response> => {
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
    return res.status(200).json({
      message: 'Misión completada y puntos añadidos al usuario',
      missionData,
      updatedUserPoints: newPoints,
    });
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Eliminar una misión
const deleteJourneysMissions = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(204).send(); // No content
  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

// Obtener las misiones de un viaje con detalles de challenge y city
const getJourneysMissionsByJourneyId = async (req: Request, res: Response): Promise<Response> => {
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
    return res.status(200).json(response); // Responder con los detalles del viaje, la ciudad y las misiones
  } catch (error) {
    return res.status(400).json({ error: "Error" }); // Devolver el error si ocurre
  }
};

// Obtener las misiones de un usuario
const getJourneysMissionsByUserId = async (req: Request, res: Response): Promise<Response> => {
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
    return res.status(200).json(missionsData);

  } catch (error) {
    return res.status(400).json({ error: "Error" });
  }
};

export {
  getJourneysMissions,
  getJourneysMissionsById,
  createJourneysMissions,
  updateJourneysMissions,
  deleteJourneysMissions,
  getJourneysMissionsByJourneyId,
  getJourneysMissionsByUserId,
  completeJourneysMissions
};
