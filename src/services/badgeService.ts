import { supabase } from './supabase';

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
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    return [];
  }
};

// Obtener las insignias de un usuario
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (*)
      `)
      .eq('userId', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    return [];
  }
};

// Desbloquear una insignia para un usuario
export const unlockBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    // Verificar si el usuario ya tiene esta insignia
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', badgeId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 es el código de "no se encontró registro", que es lo que esperamos
      throw checkError;
    }

    // Si ya tiene la insignia, no hacer nada
    if (existingBadge) return true;

    // Añadir la insignia al usuario
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert([
        {
          userId,
          badgeId,
          unlocked_at: new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;
    return true;
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
    console.error('Error al verificar insignias de misiones:', error);
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
      .from('user_connections') // Ajustar al nombre real de la tabla de conexiones
      .select('id', { count: 'exact' })
      .eq('userId', userId)
      .eq('status', 'accepted'); // Solo contar conexiones aceptadas
    
    if (connectionsError) {
      console.error('Error al contar conexiones sociales:', connectionsError);
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

// Verificar todas las posibles insignias para un usuario
export const checkAllBadges = async (userId: string): Promise<string[]> => {
  try {
    const missionBadges = await checkMissionBadges(userId);
    const levelBadges = await checkLevelBadges(userId);
    const cityBadges = await checkCityBadges(userId);
    const socialBadges = await checkSocialBadges(userId);
    const specialBadges = await checkSpecialBadges(userId);
    
    return [
      ...missionBadges,
      ...levelBadges,
      ...cityBadges,
      ...socialBadges,
      ...specialBadges
    ];
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

// Mapeo de eventos a IDs de insignias específicas
const specificBadgesMap: Record<string, string[]> = {
  'completeMission': [
    'dc8272f5-d661-402f-a9a3-46bf86289bd3', // Insignia por completar misión
    // Aquí se pueden añadir más IDs de insignias relacionadas
  ],
  'visitNewCity': [
    '49a07ba9-f0c6-40f1-ab8e-f4f7d56c3f2e', // Insignia por visitar una nueva ciudad
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
    if (!userId) return [];
    
    // Obtener los IDs de insignias correspondientes al evento
    const badgeIds = specificBadgesMap[eventType] || [];
    if (badgeIds.length === 0) return [];
    
    const awardedBadges: string[] = [];
    
    // Desbloquear cada insignia
    await Promise.all(
      badgeIds.map(async (badgeId) => {
        const result = await unlockBadge(userId, badgeId);
        if (result) {
          // Obtener el nombre de la insignia para retornarlo
          const { data } = await supabase
            .from('badges')
            .select('name')
            .eq('id', badgeId)
            .single();
            
          if (data?.name) {
            awardedBadges.push(data.name);
          }
        }
      })
    );
    
    return awardedBadges;
  } catch (error) {
    console.error(`Error al otorgar insignias específicas para ${eventType}:`, error);
    return [];
  }
};

// Función para verificar si el usuario ya tiene la insignia de nueva ciudad
// y otorgarle 500 puntos extra si es así
export const checkNewCityBadgeAndAwardPoints = async (userId: string): Promise<{
  alreadyHasBadge: boolean;
  pointsAwarded: number;
  badgeName?: string;
}> => {
  try {
    if (!userId) return { alreadyHasBadge: false, pointsAwarded: 0 };
    
    // ID de la insignia de nueva ciudad
    const newCityBadgeId = '49a07ba9-f0c6-40f1-ab8e-f4f7d56c3f2e';
    
    // Obtener el nombre de la insignia
    const { data: badgeData } = await supabase
      .from('badges')
      .select('name')
      .eq('id', newCityBadgeId)
      .single();
      
    const badgeName = badgeData?.name || 'Explorador de Nuevas Ciudades';
    
    // Verificar si el usuario ya tiene la insignia
    const { data, error } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', newCityBadgeId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // Si hay un error que no sea "no se encontró"
      console.error('Error al verificar insignia:', error);
      return { alreadyHasBadge: false, pointsAwarded: 0 };
    }
    
    // Si el usuario ya tiene la insignia, otorgar puntos extra
    if (data) {
      // Actualizar los puntos del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error al obtener puntos del usuario:', userError);
        return { alreadyHasBadge: true, pointsAwarded: 0, badgeName };
      }
      
      const currentPoints = userData?.points || 0;
      const newPoints = currentPoints + 500;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error al actualizar puntos:', updateError);
        return { alreadyHasBadge: true, pointsAwarded: 0, badgeName };
      }
      
      return { alreadyHasBadge: true, pointsAwarded: 500, badgeName };
    }
    
    // Si el usuario no tiene la insignia, solo intentamos otorgarla
    await awardSpecificBadges(userId, 'visitNewCity');
    return { alreadyHasBadge: false, pointsAwarded: 0, badgeName };
  } catch (error) {
    console.error('Error en checkNewCityBadgeAndAwardPoints:', error);
    return { alreadyHasBadge: false, pointsAwarded: 0 };
  }
};

// Función para verificar y otorgar la insignia de Fotógrafo Viajero
export const checkPhotographerBadge = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Contar fotos subidas por el usuario
    const { data, error, count } = await supabase
      .from('user_photos') // Ajustar al nombre real de la tabla
      .select('id', { count: 'exact' })
      .eq('userId', userId);
      
    if (error) {
      console.error('Error al contar fotos del usuario:', error);
      return false;
    }
    
    const photoCount = count || 0;
    
    // Si el usuario ha subido al menos 50 fotos
    if (photoCount >= 50) {
      // Buscar la insignia correspondiente
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Fotógrafo Viajero')
        .single();
      
      if (badgeData?.id) {
        // Otorgar la insignia
        return await unlockBadge(userId, badgeData.id);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar insignia de fotógrafo:', error);
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
      console.error('Error al contar misiones diarias:', error);
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

// Función para verificar y otorgar la insignia de Explorador Nocturno
export const checkNightExplorerBadge = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Contar misiones completadas durante la noche (entre 8 PM y 6 AM)
    const { data, error, count } = await supabase
      .from('journeys_missions')
      .select('id, completed_at', { count: 'exact' })
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .not('completed_at', 'is', null);
      
    if (error) {
      console.error('Error al contar misiones nocturnas:', error);
      return false;
    }
    
    // Filtrar para contar solo misiones nocturnas
    let nightMissions = 0;
    if (data) {
      nightMissions = data.filter((mission: { completed_at: string | null }) => {
        if (!mission.completed_at) return false;
        
        const completionTime = new Date(mission.completed_at);
        const hour = completionTime.getHours();
        
        // Entre 8 PM (20) y 6 AM (6)
        return hour >= 20 || hour < 6;
      }).length;
    }
    
    // Si el usuario ha completado al menos 20 misiones nocturnas
    if (nightMissions >= 20) {
      // Buscar la insignia correspondiente
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Explorador Nocturno')
        .single();
      
      if (badgeData?.id) {
        // Otorgar la insignia
        return await unlockBadge(userId, badgeData.id);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar insignia de explorador nocturno:', error);
    return false;
  }
};

// Función para verificar y otorgar la insignia de Viajero Todo Terreno
export const checkAllTerrainBadge = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Obtener tipos de lugares donde el usuario ha completado misiones
    const { data, error } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        missions!inner(
          type
        )
      `)
      .eq('journeys.userId', userId)
      .eq('completed', true);
      
    if (error) {
      console.error('Error al obtener tipos de misiones:', error);
      return false;
    }
    
    // Extraer tipos únicos de lugares
    const placeTypes = new Set<string>();
    data?.forEach((item: { missions?: { type?: string } }) => {
      if (item.missions?.type) {
        placeTypes.add(item.missions.type);
      }
    });
    
    // Si el usuario ha completado misiones en al menos 5 tipos diferentes de lugares
    if (placeTypes.size >= 5) {
      // Buscar la insignia correspondiente
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Viajero Todo Terreno')
        .single();
      
      if (badgeData?.id) {
        // Otorgar la insignia
        return await unlockBadge(userId, badgeData.id);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar insignia todo terreno:', error);
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
    const nightExplorerResult = await checkNightExplorerBadge(userId);
    const allTerrainResult = await checkAllTerrainBadge(userId);
    
    // Obtener nombres de las insignias desbloqueadas
    if (photographerResult || marathonResult || nightExplorerResult || allTerrainResult) {
      const badgeNames = ['Fotógrafo Viajero', 'Maratonista de Viajes', 'Explorador Nocturno', 'Viajero Todo Terreno'];
      
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