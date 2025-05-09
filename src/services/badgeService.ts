import axios from 'axios';

// URL base de la API
const API_URL = 'http://192.168.1.38:5000/api';

// Tipos de datos para insignias
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'missions' | 'cities' | 'level' | 'social' | 'special';
  threshold: number; // Número requerido para desbloquear (ej: 5 misiones completadas)
  created_at: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlocked_at: string;
  badges?: Badge; // Para incluir los datos de la insignia a través de join
}

// Funciones para gestionar las insignias

// Obtener todas las insignias disponibles
export const getAllBadges = async (): Promise<Badge[]> => {
  try {
    const response = await axios.get(`${API_URL}/badges`);
    return response.data || [];
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    return [];
  }
};

// Obtener las insignias de un usuario
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    if (!userId) {
      console.error('getUserBadges: No se proporcionó userId');
      return [];
    }
    
    const response = await axios.get(`${API_URL}/badges/user/${userId}`);
    return response.data || [];
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    return [];
  }
};

// Desbloquear una insignia para un usuario
export const unlockBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    console.log(`Intentando desbloquear insignia: ID=${badgeId} para usuario: ID=${userId}`);
    
    if (!userId || !badgeId) {
      console.error('Parámetros insuficientes para unlockBadge', { userId, badgeId });
      return false;
    }
    
    const response = await axios.post(`${API_URL}/badges/unlock`, {
      userId,
      badgeId
    });
    
    if (response.data.success) {
      console.log(`Respuesta de API: ${response.data.message}`);
      return true;
    } else {
      console.error(`Error al desbloquear insignia:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error al desbloquear insignia:', error);
    return false;
  }
};

// Verificar y otorgar insignias basadas en misiones completadas
export const checkMissionBadges = async (userId: string): Promise<string[]> => {
  try {
    // Ahora usaremos la API para verificar todas las insignias
    return await checkAllBadges(userId);
  } catch (error) {
    console.error('Error al verificar insignias de misiones:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en nivel
export const checkLevelBadges = async (userId: string): Promise<string[]> => {
  try {
    // Ahora está incluido en checkAllBadges
    return [];
  } catch (error) {
    console.error('Error al verificar insignias de nivel:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en ciudades visitadas
export const checkCityBadges = async (userId: string): Promise<string[]> => {
  try {
    // Ahora está incluido en checkAllBadges
    return [];
  } catch (error) {
    console.error('Error al verificar insignias de ciudades:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en conexiones sociales
export const checkSocialBadges = async (userId: string): Promise<string[]> => {
  try {
    // Ahora está incluido en checkAllBadges
    return [];
  } catch (error) {
    console.error('Error al verificar insignias sociales:', error);
    return [];
  }
};

// Verificar todas las posibles insignias para un usuario
export const checkAllBadges = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) {
      console.error('checkAllBadges: No se proporcionó userId');
      return [];
    }
    
    const response = await axios.get(`${API_URL}/badges/check/${userId}`);
    
    if (response.data.success) {
      return response.data.unlockedBadges || [];
    } else {
      console.error('Error en respuesta de checkAllBadges:', response.data.error);
      return [];
    }
  } catch (error) {
    console.error('Error al verificar todas las insignias:', error);
    return [];
  }
};

// Otorgar la insignia específica por completar una misión
export const awardFirstMissionBadge = async (userId: string): Promise<boolean> => {
  try {
    // ID específico de la insignia por completar la primera misión
    const badgeId = 'dc8272f5-d661-402f-a9a3-46bf86289bd3';
    
    // Desbloquear la insignia para el usuario
    const result = await unlockBadge(userId, badgeId);
    
    return result;
  } catch (error) {
    console.error('Error al otorgar insignia de primera misión:', error);
    return false;
  }
};

// Función genérica para otorgar insignias específicas según el evento
export const awardSpecificBadges = async (userId: string, eventType: string): Promise<string[]> => {
  try {
    if (!userId) {
      console.log('awardSpecificBadges: No se proporcionó userId');
      return [];
    }
    
    console.log(`awardSpecificBadges: Procesando evento "${eventType}" para usuario ${userId}`);
    
    // Para mantener la compatibilidad, usamos el mapeo local y llamamos a la API para cada insignia
    const badgeIds = specificBadgesMap[eventType] || [];
    
    if (badgeIds.length === 0) {
      console.log(`No hay insignias configuradas para el evento "${eventType}"`);
      return [];
    }
    
    console.log(`Insignias encontradas para ${eventType}:`, badgeIds);
    
    const awardedBadges: string[] = [];
    
    // Desbloquear cada insignia usando la API
    for (const badgeId of badgeIds) {
      try {
        const success = await unlockBadge(userId, badgeId);
        
        if (success) {
          // Obtener los detalles de la insignia
          const allBadges = await getAllBadges();
          const badge = allBadges.find(b => b.id === badgeId);
          
          if (badge) {
            awardedBadges.push(badge.name);
          }
        }
      } catch (error) {
        console.error(`Error al desbloquear insignia ${badgeId}:`, error);
      }
    }
    
    return awardedBadges;
  } catch (error) {
    console.error(`Error al otorgar insignias específicas para ${eventType}:`, error);
    return [];
  }
};

// Mapeo de eventos a IDs de insignias específicas
const specificBadgesMap: Record<string, string[]> = {
  'completeMission': [
    'dc8272f5-d661-402f-a9a3-46bf86289bd3', // Insignia por completar misión
  ],
  'visitNewCity': [
    'e733a802-553b-4a69-ae09-9b772dd7f8f1', // Insignia por visitar una nueva ciudad
  ],
  'uploadPhotos': [],
  'completeMissionsInDay': [],
  'completeNightMissions': [],
  'completeVariedMissions': [],
  'visitCity': [],
  'achieveLevel': [],
};

// Las siguientes funciones mantienen solo una versión simplificada para compatibilidad
export const checkNewCityBadgeAndAwardPoints = async (userId: string): Promise<{
  alreadyHasBadge: boolean;
  pointsAwarded: number;
  badgeName?: string;
}> => {
  try {
    // ID de la insignia de nueva ciudad
    const badgeId = 'e733a802-553b-4a69-ae09-9b772dd7f8f1';
    const badgeName = 'Explorador de Nuevas Ciudades';
    
    // Obtener insignias del usuario
    const userBadges = await getUserBadges(userId);
    
    // Verificar si ya tiene la insignia
    const hasNewCityBadge = userBadges.some(ub => ub.badgeId === badgeId);
    
    if (hasNewCityBadge) {
      // Si ya tiene la insignia, otorgar puntos extra (esto requeriría otra API)
      return { alreadyHasBadge: true, pointsAwarded: 0, badgeName };
    }
    
    // Si no tiene la insignia, intentar desbloquearla
    const success = await unlockBadge(userId, badgeId);
    
    return { 
      alreadyHasBadge: false, 
      pointsAwarded: 0,
      badgeName: success ? badgeName : undefined
    };
  } catch (error) {
    console.error('Error en checkNewCityBadgeAndAwardPoints:', error);
    return { alreadyHasBadge: false, pointsAwarded: 0 };
  }
};

export const checkPhotographerBadge = async (userId: string): Promise<boolean> => {
  // Estas funciones específicas estarían mejor integradas en el backend
  return false;
};

export const checkMarathonBadge = async (userId: string): Promise<boolean> => {
  return false;
};

export const checkNightExplorerBadge = async (userId: string): Promise<boolean> => {
  return false;
};

export const checkAllTerrainBadge = async (userId: string): Promise<boolean> => {
  return false;
};

export const checkSpecialBadges = async (userId: string): Promise<string[]> => {
  return [];
}; 