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
    console.log(`Iniciando desbloqueo de insignia: ID=${badgeId} para usuario: ID=${userId}`);
    
    if (!userId || !badgeId) {
      console.error('Parámetros insuficientes para unlockBadge', { userId, badgeId });
      return false;
    }
    
    // Verificar si existe la insignia en la tabla badges
    console.log(`Verificando si la insignia ${badgeId} existe...`);
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
    console.log(`Verificando si el usuario ${userId} ya tiene la insignia ${badgeId}...`);
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', badgeId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // PGRST116 es el código de "no se encontró registro", que es lo que esperamos
        console.log(`Confirmado: El usuario ${userId} no tiene la insignia ${badgeId} todavía`);
      } else {
        console.error(`Error al verificar si el usuario ya tiene la insignia:`, checkError);
        throw checkError;
      }
    } else {
      // Si ya tiene la insignia, no hacer nada
      console.log(`El usuario ${userId} ya tiene la insignia ${badgeId} - No se realizarán cambios`);
      return true;
    }

    console.log(`Insertando nueva insignia para usuario ${userId}: ${badgeId}`);
    
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

// Función para verificar si el usuario ya tiene la insignia de nueva ciudad
// y otorgarle 500 puntos extra si es así
export const checkNewCityBadgeAndAwardPoints = async (userId: string): Promise<{
  alreadyHasBadge: boolean;
  pointsAwarded: number;
  badgeName?: string;
}> => {
  try {
    if (!userId) {
      console.log('checkNewCityBadgeAndAwardPoints: userId no proporcionado');
      return { alreadyHasBadge: false, pointsAwarded: 0 };
    }
    
    console.log(`checkNewCityBadgeAndAwardPoints: Verificando insignia para usuario ${userId}`);
    
    // ID de la insignia de nueva ciudad
    const newCityBadgeId = 'e733a802-553b-4a69-ae09-9b772dd7f8f1';
    console.log(`ID de insignia a verificar: ${newCityBadgeId}`);
    
    // Obtener el nombre de la insignia
    const { data: badgeData, error: badgeError } = await supabase
      .from('badges')
      .select('name')
      .eq('id', newCityBadgeId)
      .single();
      
    if (badgeError) {
      console.error('Error al obtener datos de la insignia:', badgeError);
    }
    
    const badgeName = badgeData?.name || 'Explorador de Nuevas Ciudades';
    console.log(`Nombre de la insignia: ${badgeName}`);
    
    // Verificar si el usuario ya tiene la insignia
    console.log(`Verificando si el usuario ${userId} ya tiene la insignia ${newCityBadgeId}`);
    const { data, error } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', newCityBadgeId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('El usuario no tiene la insignia (error PGRST116)');
      } else {
        console.error('Error al verificar insignia:', error);
        return { alreadyHasBadge: false, pointsAwarded: 0 };
      }
    }
    
    // Si el usuario ya tiene la insignia, otorgar puntos extra
    if (data) {
      console.log(`Usuario ${userId} ya tiene la insignia ${newCityBadgeId}`);
      
      // Actualizar los puntos del usuario
      console.log('Obteniendo puntos actuales del usuario');
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
      console.log(`Puntos actuales: ${currentPoints}, Nuevos puntos: ${newPoints}`);
      
      console.log(`Actualizando puntos del usuario ${userId} a ${newPoints}`);
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error al actualizar puntos:', updateError);
        return { alreadyHasBadge: true, pointsAwarded: 0, badgeName };
      }
      
      console.log(`Se otorgaron 500 puntos extra al usuario ${userId}`);
      
      // Crear notificación para los puntos extra
      /* 
      try {
        await supabase
          .from('notifications')
          .insert([{
            userId: userId,
            title: '¡500 puntos extra!',
            message: `Has recibido 500 puntos extra por descubrir una nueva ciudad teniendo ya el logro de "${badgeName}".`,
            type: 'points',
            read: false,
            created_at: new Date().toISOString()
          }]);
      } catch (notifyError) {
        console.error('Error al crear notificación de puntos:', notifyError);
      }
      */
      
      return { alreadyHasBadge: true, pointsAwarded: 500, badgeName };
    }
    
    // Si el usuario no tiene la insignia, otorgarla directamente
    try {
      console.log(`Otorgando insignia de Descubridor (ID: ${newCityBadgeId}) al usuario ${userId}`);
      const unlocked = await unlockBadge(userId, newCityBadgeId);
      
      if (unlocked) {
        console.log(`Insignia otorgada correctamente: ${badgeName}`);
        
        // Crear notificación para el usuario
        /*
        try {
          await supabase
            .from('notifications')
            .insert([{
              userId: userId,
              title: '¡Nuevo logro desbloqueado!',
              message: `Has desbloqueado el logro "${badgeName}" por descubrir una nueva ciudad.`,
              type: 'achievement',
              read: false,
              created_at: new Date().toISOString()
            }]);
        } catch (notifyError) {
          console.error('Error al crear notificación:', notifyError);
        }
        */
        
        return { alreadyHasBadge: false, pointsAwarded: 0, badgeName };
      } else {
        console.error('Error al desbloquear insignia de nueva ciudad');
        return { alreadyHasBadge: false, pointsAwarded: 0 };
      }
    } catch (unlockError) {
      console.error('Error en proceso de desbloqueo de insignia:', unlockError);
      return { alreadyHasBadge: false, pointsAwarded: 0 };
    }
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
