import axios from 'axios';
import { API_URL } from '../config/api';
import { addPointsToUser, deductPointsFromUser } from './pointsService';
import { generateMissionHint } from './aiService';

// Precio en puntos para obtener una pista
export const HINT_COST = 15;

// Interfaz para la pista
export interface MissionHint {
  hint: string;
  missionId?: string;
}

/**
 * Obtiene una pista para una misión específica
 * @param userId ID del usuario que solicita la pista
 * @param missionId ID de la misión para la cual se solicita la pista
 * @returns Objeto con la pista
 */
export const getMissionHint = async (userId: string, missionId: string): Promise<MissionHint> => {
  try {
    console.log('Solicitando pista con:', { userId, missionId, url: `${API_URL}/missions/hint/${userId}/${missionId}` });
    
    const response = await axios.get(`${API_URL}/missions/hint/${userId}/${missionId}`);
    console.log('Respuesta del servidor:', response.data);
    
    const data = response.data as { hint: string; missionId?: string };
    
    // Validar que la respuesta tenga la estructura correcta
    if (!data || typeof data.hint !== 'string') {
      console.error('Respuesta inválida:', data);
      throw new Error('Respuesta inválida del servidor');
    }

    return {
      hint: data.hint,
      missionId: data.missionId || missionId
    };
  } catch (error: any) {
    console.error('Error detallado al obtener pista:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: `${API_URL}/missions/hint/${userId}/${missionId}`
    });
    throw error;
  }
};

export const getMissionsByCityAndDuration = async (city: string, duration: number) => {
  try {
    const response = await axios.get(`${API_URL}/missions/city`, {
      params: { city, duration }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching missions:', error);
    throw error;
  }
};
