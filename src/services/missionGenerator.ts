import axios from 'axios';
import { API_URL } from '../config/api';
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
  tags: string[] = [],
  useLogicalOrder: boolean = false
) => {
  try {
    // Limpiar el nombre de la ciudad
    const cleanCityName = cityName.trim();

    console.log('generateMission recibió parámetros:', {
      cityName: cleanCityName,
      duration,
      missionCount,
      userId,
      startDate,
      endDate,
      tags,
      useLogicalOrder
    });

    // Validar parámetros requeridos
    if (!cleanCityName || !duration || !userId) {
      throw new Error('Faltan parámetros requeridos: cityName, duration, userId');
    }

    // Convertir las fechas a formato ISO
    const formattedStartDate = startDate ? startDate.toISOString() : null;
    const formattedEndDate = endDate ? endDate.toISOString() : null;

    console.log('Enviando request a la API con datos:', {
      cityName: cleanCityName,
      duration,
      missionCount,
      userId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      tags,
      useLogicalOrder
    });

    const response = await axios.post(`${API_URL}/missions/generate`, {
      cityName: cleanCityName,
      duration,
      missionCount,
      userId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      tags,
      useLogicalOrder
    });

    console.log('Respuesta de la API:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error generando misiones:', error);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(error.response.data.error || 'Error al generar misiones');
    }
    throw error;
  }
};

export default generateMission;
