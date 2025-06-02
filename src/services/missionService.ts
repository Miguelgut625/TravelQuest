import { supabase } from './supabase';
import { addPointsToUser, deductPointsFromUser } from './pointsService';
import { generateMissionHint } from './aiService';

// Precio en puntos para obtener una pista
export const HINT_COST = 15;

// Interfaz para la pista
export interface MissionHint {
  hint: string;
  missionId: string;
}

/**
 * Obtiene una pista para una misión específica
 * @param userId ID del usuario que solicita la pista
 * @param missionId ID de la misión para la cual se solicita la pista
 * @returns Objeto con la pista
 */
export const getMissionHint = async (userId: string, missionId: string): Promise<MissionHint> => {
  try {
    // Verificar si hay puntos suficientes
    await deductPointsFromUser(userId, HINT_COST);

    // Obtener información de la misión para generar una pista contextualizada
    const { data: missionData, error: missionError } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        journeyId,
        challengeId,
        journeys (
          id, 
          cities (
            name
          )
        ),
        challenges (
          id,
          title,
          description,
          difficulty
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !missionData) {
      throw missionError || new Error('No se encontró la misión');
    }

    const missionTitle = missionData.challenges.title;
    const missionDescription = missionData.challenges.description;
    // Obtener el nombre de la ciudad a través de la relación con journeys
    const cityName = missionData.journeys?.cities?.name || 'Ciudad desconocida';
    
    // Generar pista utilizando AI
    const hint = await generateMissionHint(
      missionDescription,
      missionTitle,
      cityName
    );

    // Registrar el uso de la pista
    await supabase
      .from('mission_hints')
      .insert([
        {
          userId,
          missionId,
          hint,
          created_at: new Date().toISOString()
        }
      ]);

    return {
      hint,
      missionId
    };
  } catch (error) {
    console.error('Error al obtener pista para la misión:', error);
    throw error;
  }
};

export const getMissionsByCityAndDuration = async (city: string, duration: number) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('city', city)
      .lte('duration', duration);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching missions:', error);
    throw error;
  }
};
