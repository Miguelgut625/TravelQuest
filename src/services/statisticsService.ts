import axios from 'axios';
import { API_URL } from '../config/api';

/**
 * Interfaz para las estadísticas avanzadas de misiones
 */
export interface AdvancedMissionStats {
  totalMissions: number;
  completedMissions: number;
  pendingMissions: number;
  expiredMissions: number;
  completionRate: number;
  pointsEarned: number;
  averageTimeToComplete: number; // en días
  completedByCategory: Record<string, number>;
  mostCompletedCategory: string;
  topCities: Array<{name: string, count: number}>;
}

/**
 * Obtiene estadísticas avanzadas de misiones para un usuario
 * @param userId ID del usuario
 * @returns Estadísticas avanzadas de misiones
 */
export const getAdvancedMissionStats = async (userId: string): Promise<AdvancedMissionStats> => {
  try {
    if (!userId) {
      throw new Error('Se requiere ID de usuario para obtener estadísticas');
    }

    const response = await axios.get(`${API_URL}/profile/${userId}/advanced-stats`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estadísticas avanzadas:', error);
    throw error;
  }
}; 