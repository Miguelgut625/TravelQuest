import { supabase } from './supabase';

// Interfaces para las insignias
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
    console.log(`Intentando desbloquear insignia: ID=${badgeId} para usuario: ID=${userId}`);


    // Verificar si existe la insignia en la tabla badges
    const { data: badgeExists, error: badgeError } = await supabase
      .from('badges')
      .select('id, name')
      .eq('id', badgeId)
      .single();

    if (badgeError) {
      console.error(`Error al verificar si la insignia ${badgeId} existe:`, badgeError);
      return false;
    }

    if (!badgeExists) {
      console.error(`La insignia con ID ${badgeId} no existe en la tabla badges`);
      return false;
    }

    console.log(`Insignia encontrada: ${badgeExists.name} (${badgeId})`);

    // Verificar si el usuario ya tiene esta insignia
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', badgeId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 es el código de "no se encontró registro", que es lo que esperamos
      console.error(`Error al verificar si el usuario ya tiene la insignia:`, checkError);

      throw checkError;
    }

    // Si ya tiene la insignia, no hacer nada
    if (existingBadge) {
      console.log(`El usuario ${userId} ya tiene la insignia ${badgeId}`);
      return true;
    }

    console.log(`Intentando insertar nueva insignia para usuario ${userId}: ${badgeId}`);

    // Añadir la insignia al usuario
    const { data: insertData, error: insertError } = await supabase
      .from('user_badges')
      .insert([
        {
          userId,
          badgeId,
          unlocked_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      console.error(`Error al insertar insignia en user_badges:`, insertError);
      throw insertError;
    }

    console.log(`Insignia otorgada exitosamente. Datos insertados:`, insertData);
    return true;
  } catch (error) {
    console.error('Error al desbloquear insignia:', error);
    return false;
  }
};

// Verificar y otorgar insignias basadas en misiones completadas
export const checkMissionBadges = async (userId: string): Promise<string[]> => {
  try {
    let completedMissions = 0;
    
    // Obtener misiones completadas como lo hace ProfileScreen.tsx
    try {
      // Obtener los journeys del usuario con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          cityId,
          journeys_missions!inner (
            completed,
            challenges!inner (
              points
            )
          )
        `)
        .eq('userId', userId);

      if (journeysError) {
        console.error('Error al consultar journeys para insignias:', journeysError);
      } else if (journeys) {
        // Contar misiones completadas
        let missionCount = 0;
        (journeys as any[])?.forEach((journey: any) => {
          journey.journeys_missions?.forEach((mission: any) => {
            if (mission.completed) {
              missionCount++;
            }
          });
        });
        
        completedMissions = missionCount;
        console.log(`Encontradas ${completedMissions} misiones completadas para el usuario ${userId} en journeys_missions`);
      }
    } catch (error) {
      console.error('Error accediendo a journeys_missions:', error);
    }
    
    // Si aún no tenemos misiones, intentar consultar solo la tabla del usuario
    if (completedMissions === 0) {
      try {
        // Consultar directamente en la tabla de usuarios para el campo de misiones completadas
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('completed_missions, stats:user_stats (completed_missions)')
          .eq('id', userId)
          .single();
        
        if (!userError && userData) {
          // Intentar obtener el conteo de la tabla del usuario o de la tabla user_stats relacionada
          if (userData.completed_missions && typeof userData.completed_missions === 'number') {
            completedMissions = userData.completed_missions;
            console.log(`Encontradas ${completedMissions} misiones completadas en el perfil del usuario`);
          } else if (userData.stats?.completed_missions && typeof userData.stats.completed_missions === 'number') {
            completedMissions = userData.stats.completed_missions;
            console.log(`Encontradas ${completedMissions} misiones completadas en las estadísticas del usuario`);
          }
        }
      } catch (error) {
        console.error('Error accediendo a stats del usuario:', error);
      }
    }
    
    console.log(`Total misiones completadas encontradas para el usuario ${userId}: ${completedMissions}`);
    
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
    // Usar la tabla 'friends' que sabemos que existe en el sistema
    let friendsCount = 0;
    
    try {
      // Obtener amigos desde la tabla friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('user2Id')
        .eq('user1Id', userId);
        
      if (!friendsError && friendsData) {
        friendsCount = friendsData.length;
        console.log(`Usuario ${userId} tiene ${friendsCount} amigos.`);
      } else if (friendsError) {
        console.error('Error al consultar tabla friends:', friendsError);
        return [];
      }
    } catch (error) {
      console.error('Error al verificar amistades:', error);
      return [];
    }
    
    // Si no se encontraron amigos, devolvemos un array vacío
    if (friendsCount === 0) {
      console.log('El usuario no tiene amigos. Saltando verificación de insignias sociales.');
      return [];
    }

    // Obtener las insignias sociales
    const { data: socialBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'social');

    if (badgesError) throw badgesError;

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

// Verificar y otorgar insignias especiales
export const checkSpecialBadges = async (userId: string): Promise<string[]> => {
  try {
    // Implementación pendiente para insignias especiales
    return [];
  } catch (error) {
    console.error('Error al verificar insignias especiales:', error);
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