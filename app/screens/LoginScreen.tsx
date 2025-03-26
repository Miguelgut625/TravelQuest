import { supabase } from '../services/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Accede a tu clave de API como una variable de entorno
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
  throw new Error('GOOGLE_API_KEY is not defined');
}
const genAI = new GoogleGenerativeAI(googleApiKey);

// Interfaces para los tipos de datos
interface Challenge {
  id: string;
}

interface UserChallenge {
  challengeId: string;
}

interface Journey {
  id: string;
}

// Función para obtener o crear una ciudad
const getOrCreateCity = async (cityName: string) => {
  try {
    // Primero intentamos encontrar la ciudad
    const { data: existingCity, error: searchError } = await supabase
      .from('cities')
      .select('id')
      .eq('name', cityName)
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 es el código para "no se encontraron resultados"
      throw searchError;
    }

    if (existingCity) {
      return existingCity.id;
    }

    // Si no existe la ciudad, la creamos
    const { data: newCity, error: insertError } = await supabase
      .from('cities')
      .insert([{ name: cityName }])
      .select('id')
      .single();

    if (insertError) throw insertError;
    
    return newCity.id;
  } catch (error) {
    console.error('Error al obtener/crear la ciudad:', error);
    throw error;
  }
};

// Función para obtener desafíos existentes de una ciudad que el usuario no haya solicitado
const getExistingChallenges = async (cityId: string, count: number, userId: string) => {
  try {
    // Primero obtenemos todos los desafíos de la ciudad
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*') // Seleccionar todos los campos, no solo el id
      .eq('cityId', cityId);

    if (error) throw error;

    if (!challenges || challenges.length === 0) {
      return null;
    }

    // Obtener los desafíos que el usuario ya ha solicitado
    // Primero obtenemos los journeys del usuario
    const { data: userJourneys, error: journeysError } = await supabase
      .from('journeys')
      .select('id')
      .eq('userId', userId);

    if (journeysError) throw journeysError;

    if (!userJourneys || userJourneys.length === 0) {
      // Si el usuario no tiene journeys, seleccionar aleatoriamente la cantidad solicitada
      if (challenges.length >= 10) {
        const shuffled = challenges.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      }
      return null;
    }

    // Luego obtenemos los desafíos asociados a esos journeys
    const { data: userChallenges, error: userError } = await supabase
      .from('journeys_missions')
      .select('challengeId')
      .in('journeyId', userJourneys.map((j: Journey) => j.id))
      .in('challengeId', challenges.map((c: Challenge) => c.id));

    if (userError) throw userError;

    // Filtrar los desafíos que el usuario ya ha solicitado
    const userChallengeIds = new Set(userChallenges?.map((uc: UserChallenge) => uc.challengeId) || []);
    const availableChallenges = challenges.filter((c: Challenge) => !userChallengeIds.has(c.id));

    // Si hay suficientes desafíos disponibles (10 o más)
    if (availableChallenges.length >= 10) {
      // Mezclar el array de desafíos disponibles
      const shuffled = availableChallenges.sort(() => 0.5 - Math.random());
      // Tomar solo la cantidad solicitada
      return shuffled.slice(0, count);
    }

    return null; // Retornar null si no hay suficientes desafíos disponibles
  } catch (error) {
    console.error('Error obteniendo desafíos existentes:', error);
    throw error;
  }
};

const generateMission = async (cityName: string, duration: number, missionCount: number, userId: string) => {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    // Obtener o crear la ciudad
    const cityId = await getOrCreateCity(cityName);

    // Crear un nuevo journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .insert([{
        userId,
        cityId,
        description: `Viaje a ${cityName} por ${duration} días`
      }])
      .select('id')
      .single();

    if (journeyError) {
      console.error('Error al crear el journey:', journeyError);
      throw journeyError;
    }

    // Verificar si hay suficientes desafíos existentes que el usuario no haya solicitado
    const existingChallenges = await getExistingChallenges(cityId, missionCount, userId);

    let challenges;
    if (existingChallenges && existingChallenges.length > 0) {
      // Usar desafíos existentes
      console.log('Usando desafíos existentes');
      challenges = existingChallenges;
    } else {
      // Solo generar nuevos desafíos si no hay suficientes existentes
      console.log('Generando nuevos desafíos');
      // Generar nuevos desafíos
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Genera ${missionCount} misiones en ${cityName} que se puedan completar en ${duration} días. Devuelve un objeto JSON con la siguiente estructura exacta:
{
  "misiones": [
    {
      "Título": "Título de la misión",
      "Descripción": "Descripción detallada de la misión incluyendo qué foto tomar",
      "Dificultad": "Fácil|Media|Difícil",
      "Puntos": 25|50|100
    }
  ]
}
Los puntos deben ser: 25 para Fácil, 50 para Media, 100 para Difícil. No incluyas explicaciones adicionales, solo el JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const missionsData = response.text();

      console.log('Respuesta de la API:', missionsData);

      const jsonMatch = missionsData.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró un objeto JSON válido en la respuesta');
      }

      const missions = JSON.parse(jsonMatch[0]);

      if (!missions.misiones || !Array.isArray(missions.misiones)) {
        throw new Error('La respuesta no contiene un array de misiones válido');
      }

      // Crear los desafíos
      const formattedChallenges = missions.misiones.map((mission: any) => ({
        title: mission.Título,
        description: mission.Descripción,
        cityId,
        duration,
        difficulty: mission.Dificultad,
        points: mission.Puntos
      }));

      const { data: newChallenges, error: challengesError } = await supabase
        .from('challenges')
        .insert(formattedChallenges)
        .select('id');

      if (challengesError) {
        console.error('Error al crear los desafíos:', challengesError);
        throw challengesError;
      }
      
      challenges = newChallenges;
    }

    // Vincular los desafíos al journey
    const journeyMissions = challenges.map((challenge: { id: string }) => ({
      journeyId: journey.id,
      challengeId: challenge.id,
      completed: false
    }));

    const { error: linkError } = await supabase
      .from('journeys_missions')
      .insert(journeyMissions);

    if (linkError) {
      console.error('Error al vincular los desafíos al journey:', linkError);
      throw linkError;
    }

    console.log('Journey y desafíos creados exitosamente');
    return { journeyId: journey.id, challenges };
  } catch (error) {
    console.error('Error generando desafíos:', error);
    throw error;
  }
};

export default generateMission;