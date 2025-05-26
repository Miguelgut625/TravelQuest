import { supabase } from './supabase';
import axios from 'axios';
import { API_URL } from '../config/api';

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
    const { data } = await axios.get(`${API_URL}/badges`);
    return data;
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    return [];
  }
};

// Obtener las insignias de un usuario
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data } = await axios.get(`${API_URL}/badges/user/${userId}`);
    return data;
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    return [];
  }
};

// Desbloquear una insignia para un usuario
export const unlockBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    const { data } = await axios.post(`${API_URL}/badges/unlock`, {
      userId,
      badgeId
    });
    return data.success;
  } catch (error) {
    console.error('Error al desbloquear insignia:', error);
    return false;
  }
};

// Verificar y otorgar insignias basadas en misiones completadas
export const checkMissionBadges = async (userId: string): Promise<string[]> => {
  try {
    // Obtener el número de misiones completadas por el usuario
    const { data: missionStats, error: statsError } = await supabase
      .from('journeys_missions')
      .select('id, completed')
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .count();

    if (statsError) throw statsError;

    const completedMissions = missionStats?.count || 0;

    // Obtener las insignias de misiones
    const { data: missionBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'missions');

    if (badgesError) throw badgesError;
    
    const unlockedBadges: string[] = [];

    // Comprobar cada insignia
    await Promise.all(
      (missionBadges || []).map(async (badge: Badge) => {
        if (completedMissions >= badge.threshold) {
          const unlocked = await unlockBadge(userId, badge.id);
          if (unlocked) unlockedBadges.push(badge.name);
        }
      })
    );

    return unlockedBadges;
  } catch (error) {
    return [];
  }
};

// Verificar y otorgar insignias basadas en nivel
export const checkLevelBadges = async (userId: string): Promise<string[]> => {
  try {
    // Obtener el nivel actual del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const userLevel = userData?.level || 0;

    // Obtener las insignias de nivel
    const { data: levelBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'level');

    if (badgesError) throw badgesError;
    
    const unlockedBadges: string[] = [];

    // Comprobar cada insignia
    await Promise.all(
      (levelBadges || []).map(async (badge: Badge) => {
        if (userLevel >= badge.threshold) {
          const unlocked = await unlockBadge(userId, badge.id);
          if (unlocked) unlockedBadges.push(badge.name);
        }
      })
    );

    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias de nivel:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en ciudades visitadas
export const checkCityBadges = async (userId: string): Promise<string[]> => {
  try {
    // Obtener las ciudades visitadas por el usuario
    const { data: journeys, error: journeysError } = await supabase
      .from('journeys')
      .select('cityId')
      .eq('userId', userId);

    if (journeysError) throw journeysError;

    // Contar ciudades únicas
    const uniqueCities = new Set(journeys?.map((journey: any) => journey.cityId));
    const citiesCount = uniqueCities.size;

    // Obtener las insignias de ciudades
    const { data: cityBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'cities');

    if (badgesError) throw badgesError;
    
    const unlockedBadges: string[] = [];

    // Comprobar cada insignia
    await Promise.all(
      (cityBadges || []).map(async (badge: Badge) => {
        if (citiesCount >= badge.threshold) {
          const unlocked = await unlockBadge(userId, badge.id);
          if (unlocked) unlockedBadges.push(badge.name);
        }
      })
    );

    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias de ciudades:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en conexiones sociales
export const checkSocialBadges = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    
    // Obtener el número de amigos del usuario
    const { data: connections, error: connectionsError, count } = await supabase
      .from('friends') 
      .select('id', { count: 'exact' })
      .eq('user1Id', userId)
    
    if (connectionsError) {
      return [];
    }
    
    const friendsCount = count || 0;
    
    // Obtener las insignias sociales
    const { data: socialBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'social');
    
    if (badgesError) {
      console.error('Error al obtener insignias sociales:', badgesError);
      return [];
    }
    
    const unlockedBadges: string[] = [];
    
    // Comprobar cada insignia
    await Promise.all(
      (socialBadges || []).map(async (badge: Badge) => {
        if (friendsCount >= badge.threshold) {
          const unlocked = await unlockBadge(userId, badge.id);
          if (unlocked) unlockedBadges.push(badge.name);
        }
      })
    );
    
    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias sociales:', error);
    return [];
  }
};

// Verificar y otorgar todas las posibles insignias para un usuario
export const checkAllBadges = async (userId: string): Promise<string[]> => {
  try {
    const { data } = await axios.get(`${API_URL}/badges/check/${userId}`);
    return data.unlockedBadges || [];
  } catch (error) {
    console.error('Error al verificar insignias:', error);
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

// Mapeo de eventos a IDs de insignias específicas
const specificBadgesMap: Record<string, string[]> = {
  'completeMission': [
    'dc8272f5-d661-402f-a9a3-46bf86289bd3', // Insignia por completar misión
    // Aquí se pueden añadir más IDs de insignias relacionadas
  ],
  'visitNewCity': [
    'e733a802-553b-4a69-ae09-9b772dd7f8f1', // Insignia por visitar una nueva ciudad
  ],
  'uploadPhotos': [
    // ID para la insignia de Fotógrafo Viajero - implementar cuando se tenga el ID
  ],
  'completeMissionsInDay': [
    // ID para la insignia de Maratonista de Viajes - implementar cuando se tenga el ID
  ],
  'completeNightMissions': [
    // ID para la insignia de Explorador Nocturno - implementar cuando se tenga el ID
  ],
  'completeVariedMissions': [
    // ID para la insignia de Viajero Todo Terreno - implementar cuando se tenga el ID
  ],
  'visitCity': [
    // IDs de insignias por visitar ciudades específicas
  ],
  'achieveLevel': [
    // IDs de insignias por alcanzar niveles específicos
  ],
  // Agregar más eventos según sea necesario
};

// Función genérica para otorgar insignias específicas según el evento
export const awardSpecificBadges = async (userId: string, eventType: string): Promise<string[]> => {
  try {
    if (!userId) {
      console.log('awardSpecificBadges: No se proporcionó userId');
      return [];
    }
    
    console.log(`awardSpecificBadges: Procesando evento "${eventType}" para usuario ${userId}`);
    
    // Obtener los IDs de insignias correspondientes al evento
    const badgeIds = specificBadgesMap[eventType] || [];
    
    if (badgeIds.length === 0) {
      console.log(`No hay insignias configuradas para el evento "${eventType}"`);
      return [];
    }
    
    console.log(`Insignias encontradas para ${eventType}:`, badgeIds);
    
    const awardedBadges: string[] = [];
    
    // Desbloquear cada insignia
    await Promise.all(
      badgeIds.map(async (badgeId) => {
        console.log(`Intentando desbloquear insignia ${badgeId} para usuario ${userId}`);
        
        // Verificar que la insignia existe
        const { data: badgeExists, error: badgeCheckError } = await supabase
          .from('badges')
          .select('id, name')
          .eq('id', badgeId)
          .single();
          
        if (badgeCheckError) {
          console.error(`Error al verificar si existe la insignia ${badgeId}:`, badgeCheckError);
          return;
        }
        
        if (!badgeExists) {
          console.error(`La insignia con ID ${badgeId} no existe en la base de datos`);
          return;
        }
        
        console.log(`Confirmado: La insignia ${badgeId} (${badgeExists.name}) existe`);
        
        const result = await unlockBadge(userId, badgeId);
        if (result) {
          // Obtener el nombre de la insignia para retornarlo
          const { data } = await supabase
            .from('badges')
            .select('name')
            .eq('id', badgeId)
            .single();
            
          if (data?.name) {
            console.log(`Insignia "${data.name}" otorgada con éxito`);
            awardedBadges.push(data.name);
          }
        } else {
          console.log(`No se pudo desbloquear la insignia ${badgeId} (posiblemente ya la tenía)`);
        }
      })
    );
    
    console.log(`Total de insignias otorgadas: ${awardedBadges.length}`);
    return awardedBadges;
  } catch (error) {
    console.error(`Error al otorgar insignias específicas para ${eventType}:`, error);
    return [];
  }
};

// Verificar insignia de nueva ciudad y otorgar puntos extra
export const checkNewCityBadgeAndAwardPoints = async (userId: string): Promise<{
  alreadyHasBadge: boolean;
  pointsAwarded: number;
  badgeName?: string;
}> => {
  try {
    const { data } = await axios.get(`${API_URL}/badges/check-new-city/${userId}`);
    return {
      alreadyHasBadge: data.alreadyHasBadge,
      pointsAwarded: data.pointsAwarded,
      badgeName: data.badgeName
    };
  } catch (error) {
    console.error('Error al verificar insignia de nueva ciudad:', error);
    return { alreadyHasBadge: false, pointsAwarded: 0 };
  }
};

// Función para verificar y otorgar la insignia de Fotógrafo Viajero
export const checkPhotographerBadge = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;

    // Contar fotos subidas por el usuario, relacionando journeys_missions con journeys
    const { count, error } = await supabase
      .from('journeys_missions')
      .select('picture_url', { count: 'exact' })
      .in('journeyId',
        supabase
          .from('journeys')
          .select('id')
          .eq('userId', userId)
      );

    if (error) return false;

    const photoCount = count || 0;

    if (photoCount >= 50) {
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Fotógrafo Viajero')
        .single();

      if (badgeData?.id) {
        return await unlockBadge(userId, badgeData.id);
      }
    }

    return false;
  } catch {
    return false;
  }
};


// Función para verificar y otorgar la insignia de Maratonista de Viajes
export const checkMarathonBadge = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Obtener la fecha actual y establecer el inicio del día
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    // Contar misiones completadas hoy
    const { data, error, count } = await supabase
      .from('journeys_missions')
      .select('id', { count: 'exact' })
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);
      
    if (error) {
      return false;
    }
    
    const missionCount = count || 0;
    
    // Si el usuario ha completado al menos 10 misiones hoy
    if (missionCount >= 10) {
      // Buscar la insignia correspondiente
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Maratonista de Viajes')
        .single();
      
      if (badgeData?.id) {
        // Otorgar la insignia
        return await unlockBadge(userId, badgeData.id);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar insignia de maratonista:', error);
    return false;
  }
};




// Función para verificar todos los logros especiales
export const checkSpecialBadges = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    
    const unlockedBadges: string[] = [];
    
    // Verificar cada insignia especial
    const photographerResult = await checkPhotographerBadge(userId);
    const marathonResult = await checkMarathonBadge(userId);

    
    // Obtener nombres de las insignias desbloqueadas
    if (photographerResult || marathonResult ) {
      const badgeNames = ['Fotógrafo Viajero', 'Maratonista de Viajes'];
      
      const { data: badgesData } = await supabase
        .from('badges')
        .select('name')
        .in('name', badgeNames);
      
      badgesData?.forEach((badge: { name: string }) => {
        unlockedBadges.push(badge.name);
      });
    }
    
    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias especiales:', error);
    return [];
  }
};

// Actualizar título personalizado del usuario
export const updateUserTitle = async (userId: string, title: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> => {
  try {
    const { data } = await axios.post(`${API_URL}/badges/update-title`, {
      userId,
      title
    });
    return {
      success: true,
      user: data.user
    };
  } catch (error: any) {
    console.error('Error al actualizar título:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Error al actualizar título'
    };
  }
};

// Obtener título personalizado del usuario
export const getUserTitle = async (userId: string): Promise<string> => {
  try {
    const { data } = await axios.get(`${API_URL}/badges/user-title/${userId}`);
    return data.custom_title || '';
  } catch (error) {
    console.error('Error al obtener título:', error);
    return '';
  }
}; 