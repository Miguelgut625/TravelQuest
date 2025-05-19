import { supabase } from './supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Accede a tu clave de API como una variable de entorno
const genAI = new GoogleGenerativeAI("AIzaSyB4PuDOYXgbH9egme1UCO0CiRcOV4kVfMM");

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

// Función para verificar y crear usuario si no existe
const getOrCreateUser = async (userId: string) => {
  try {
    // Verificar si el usuario existe
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    if (existingUser) {
      return existingUser.id;
    }

    // Si no existe, crear el usuario
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email: `${userId}@temp.com`, // Email temporal
        username: `user_${userId.slice(0, 8)}`, // Username temporal
        password: 'temp_password' // Contraseña temporal
      }])
      .select('id')
      .single();

    if (insertError) throw insertError;

    return newUser.id;
  } catch (error) {
    console.error('Error al obtener/crear el usuario:', error);
    throw error;
  }
};

// Función para obtener o crear una ciudad
export const getOrCreateCity = async (cityName: string, userId?: string) => {
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

    // Si tenemos el userId, otorgar insignia de nueva ciudad o dar puntos extra
    if (userId) {
      try {
        const { awardSpecificBadges, checkNewCityBadgeAndAwardPoints } = await import('./badgeService');

        // Verificar si el usuario ya tiene la insignia y otorgar puntos extra si es así
        const badgeResult = await checkNewCityBadgeAndAwardPoints(userId);
        console.log("Resultado de comprobación de insignia:", badgeResult);

        if (!badgeResult.alreadyHasBadge) {
          // Si no tiene la insignia, otorgarla
          console.log(`Otorgando insignia de nueva ciudad al usuario ${userId}`);
          await awardSpecificBadges(userId, 'visitNewCity');
        }

        // Si dio puntos extra, mostrar mensaje (opcional)
        if (badgeResult.pointsAwarded > 0) {
          console.log(`Se otorgaron ${badgeResult.pointsAwarded} puntos extra al usuario por la nueva ciudad`);
        }
      } catch (badgeError) {
        console.error('Error al otorgar insignia de nueva ciudad:', badgeError);
        // No interrumpimos el flujo principal si hay error con las insignias
      }
    } else {
      console.log('No se ha proporcionado userId, no se otorgarán insignias');
    }

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

export const generateMission = async (
  cityName: string,
  duration: number,
  missionCount: number,
  userId: string,
  startDate: Date | null,
  endDate: Date | null,
  tags: string[] = []
) => {
  try {
    console.log('generateMission recibió fechas:', {
      startDate,
      endDate,
      duration
    });

    console.log('Tags seleccionados:', tags);

    // Crear fechas por defecto si no se proporcionan
    const validStartDate = startDate instanceof Date ? startDate : new Date();
    const validEndDate = endDate instanceof Date ? endDate : new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Convertir a ISO string para la base de datos
    const startIsoString = validStartDate.toISOString();
    const endIsoString = validEndDate.toISOString();

    console.log('Fechas validadas para misiones:', {
      startIsoString,
      endIsoString
    });

    console.log('Iniciando generación de misión:', {
      cityName,
      duration,
      missionCount,
      userId,
      startDate,
      endDate,
      tags
    });

    // Verificar y crear usuario si no existe
    await getOrCreateUser(userId);

    // Primero, usar Gemini para corregir el nombre de la ciudad
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const cityCorrectionPrompt = `Corrige el nombre de la ciudad "${cityName}" al nombre oficial y correcto. 
    Devuelve SOLO el nombre corregido, sin explicaciones ni formato adicional. 
    Por ejemplo, si el usuario escribe "akilante", debes devolver "Alicante".`;

    console.log('Prompt de corrección de ciudad:', cityCorrectionPrompt);
    const cityCorrectionResult = await model.generateContent(cityCorrectionPrompt);
    const cityCorrectionResponse = await cityCorrectionResult.response;
    const correctedCityName = cityCorrectionResponse.text().trim();

    console.log('Nombre de ciudad corregido:', correctedCityName);

    // Obtener o crear la ciudad con el nombre corregido
    const cityId = await getOrCreateCity(correctedCityName, userId);
    console.log('CityId obtenido/creado:', cityId);

    // Crear un nuevo journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .insert([{
        userId,
        cityId,
        description: `Viaje a ${correctedCityName} por ${duration} días`,
        created_at: new Date().toISOString(),
        start_date: startIsoString,
        end_date: endIsoString
      }])
      .select('id')
      .single();

    if (journeyError) {
      console.error('Error creando journey:', journeyError);
      throw journeyError;
    }

    console.log('Journey creado:', journey);

    // Verificar si hay suficientes desafíos existentes que el usuario no haya solicitado
    const existingChallenges = await getExistingChallenges(cityId, missionCount, userId);
    console.log('Desafíos existentes encontrados:', existingChallenges);

    let challenges;
    if (existingChallenges && existingChallenges.length > 0) {
      // Usar desafíos existentes
      console.log('Usando desafíos existentes');
      challenges = existingChallenges;
    } else {
      // Solo generar nuevos desafíos si no hay suficientes existentes
      console.log('Generando nuevos desafíos');

      // Preparar la parte de preferencias para el prompt
      let preferencesText = '';
      if (tags && tags.length > 0) {
        preferencesText = `Las misiones deben basarse en las siguientes preferencias del usuario: ${tags.join(', ')}.`;
      }

      // Generar nuevos desafíos
      const missionPrompt = `Genera ${missionCount} misiones en ${correctedCityName} que se puedan completar en ${duration} días. ${preferencesText}
      
Devuelve un objeto JSON con la siguiente estructura exacta:
{
  "misiones": [
    {
      "Título": "Título de la misión",
      "Descripción": "Descripción muy detallada y muy descriptiva de la misión incluyendo qué foto tomar y recomendaciones de que hacer por la zona, pide solo una foto y que sea relativamente facil de conseguir es decir no pidas una fota en una hora del dia o no pidas una foto de un sitio que es iliegal la entrada, intenta no repetir las mismas misiones",
      "Dificultad": "Fácil|Media|Difícil",
      "Puntos": 25|50|100
    }
  ]
}
Los puntos deben ser: 25 para Fácil, 50 para Media, 100 para Difícil. No incluyas explicaciones adicionales, solo el JSON.`;

      console.log('Prompt de misiones:', missionPrompt);
      const result = await model.generateContent(missionPrompt);
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

      if (challengesError) throw challengesError;

      challenges = newChallenges;
    }

    // Vincular los desafíos al journey
    const journeyMissions = challenges.map((challenge: { id: string }) => ({
      journeyId: journey.id,
      challengeId: challenge.id,
      completed: false,
      created_at: new Date().toISOString(),
      start_date: startIsoString,
      end_date: endIsoString
    }));

    console.log('Vincular misiones al journey:', journeyMissions);

    const { error: linkError } = await supabase
      .from('journeys_missions')
      .insert(journeyMissions);

    if (linkError) {
      console.error('Error vinculando misiones:', linkError);
      throw linkError;
    }

    // Verificar que las misiones se hayan creado correctamente
    const { data: createdMissions, error: verifyError } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        challengeId,
        completed,
        challenge:challenges (
        title,
        description,
        difficulty,
          points
        )
      `)
      .eq('journeyId', journey.id)
      .order('created_at', { ascending: true });

    if (verifyError) {
      console.error('Error verificando misiones creadas:', verifyError);
      throw verifyError;
    }

    if (!createdMissions || createdMissions.length === 0) {
      throw new Error('No se pudieron crear las misiones');
    }

    console.log('Misiones creadas verificadas:', createdMissions);

    return {
      journeyId: journey.id,
      challenges: createdMissions
    };
  } catch (error) {
    console.error('Error generando misiones:', error);
    throw error;
  }
};

export default generateMission;
