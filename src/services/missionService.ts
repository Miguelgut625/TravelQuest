import { supabase } from './supabase';
import { addPointsToUser, deductPointsFromUser } from './pointsService';

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

    // Generar pista basada en la descripción de la misión
    // Aquí podrías tener un conjunto de pistas predefinidas o generarlas dinámicamente
    // según la dificultad o el tipo de misión
    let hint = '';
    const missionTitle = missionData.challenges.title;
    const missionDescription = missionData.challenges.description;
    const difficulty = missionData.challenges.difficulty;

    // Generar pista contextualizada
    if (missionDescription.includes('fotografía') || missionDescription.includes('foto')) {
      hint = 'Busca un lugar elevado o con buena iluminación para conseguir mejores fotos.';
    } else if (missionDescription.includes('comida') || missionDescription.includes('restaurante')) {
      hint = 'Pregunta a los lugareños por los sitios más populares para probar la gastronomía local.';
    } else if (missionDescription.includes('museo') || missionDescription.includes('monumento')) {
      hint = 'Revisa el horario de apertura y considera visitar temprano para evitar multitudes.';
    } else if (missionDescription.includes('parque') || missionDescription.includes('naturaleza')) {
      hint = 'Lleva contigo agua y protección solar. Los mejores momentos para visitar son temprano en la mañana o al atardecer.';
    } else {
      // Pistas genéricas según dificultad
      switch(difficulty) {
        case 'easy':
          hint = `Para completar "${missionTitle}", observa cuidadosamente los detalles en la descripción de la misión.`;
          break;
        case 'medium':
          hint = `Para completar "${missionTitle}", considera explorar zonas menos turísticas o preguntar a los locales.`;
          break;
        case 'hard':
          hint = `Para completar "${missionTitle}", tendrás que ser creativo y pensar fuera de lo común. Considera el momento del día o eventos especiales.`;
          break;
        default:
          hint = `Presta atención a los detalles de la misión y busca elementos únicos que destaquen en tu fotografía.`;
      }
    }

    // Registrar el uso de la pista (opcional)
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
