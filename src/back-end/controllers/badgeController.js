const { supabase } = require('../../services/supabase.server.js');

// Obtener todas las insignias disponibles
const getAllBadges = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener las insignias de un usuario
const getUserBadges = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
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
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    res.status(400).json({ error: error.message });
  }
};

// Desbloquear una insignia para un usuario
const unlockBadge = async (req, res) => {
  const { userId, badgeId } = req.body;
  
  if (!userId || !badgeId) {
    return res.status(400).json({ error: 'Se requieren userId y badgeId' });
  }
  
  try {
    // Verificar si existe la insignia
    const { data: badgeExists, error: badgeError } = await supabase
      .from('badges')
      .select('id, name')
      .eq('id', badgeId)
      .single();
      
    if (badgeError) {
      return res.status(400).json({ error: badgeError.message });
    }
    
    if (!badgeExists) {
      return res.status(404).json({ error: 'La insignia no existe' });
    }
    
    // Verificar si el usuario ya tiene esta insignia
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', badgeId)
      .single();

    if (!checkError) {
      return res.status(200).json({ 
        success: true, 
        message: 'El usuario ya tiene esta insignia',
        alreadyHad: true
      });
    }

    // Añadir la insignia al usuario
    const { data: insertData, error: insertError } = await supabase
      .from('user_badges')
      .insert([{
        userId,
        badgeId,
        unlocked_at: new Date().toISOString()
      }])
      .select();

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }
    
    res.status(201).json({
      success: true,
      message: `Insignia ${badgeExists.name} desbloqueada con éxito`,
      badge: badgeExists,
      alreadyHad: false
    });
  } catch (error) {
    console.error('Error al desbloquear insignia:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verificar y otorgar insignias basadas en misiones completadas
const checkMissionBadges = async (userId) => {
  try {
    const { data: missionStats, error: statsError } = await supabase
      .from('journeys_missions')
      .select('id, completed')
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .count();

    if (statsError) throw statsError;

    const completedMissions = missionStats?.count || 0;

    const { data: missionBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'missions');

    if (badgesError) throw badgesError;
    
    const unlockedBadges = [];

    for (const badge of (missionBadges || [])) {
      if (completedMissions >= badge.threshold) {
        try {
          const { data: existingBadge, error: checkError } = await supabase
            .from('user_badges')
            .select('id')
            .eq('userId', userId)
            .eq('badgeId', badge.id)
            .single();
          
          if (!checkError) continue;
          
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert([{
              userId,
              badgeId: badge.id,
              unlocked_at: new Date().toISOString()
            }]);
            
          if (insertError) continue;
          
          unlockedBadges.push(badge.name);
        } catch (error) {
          continue;
        }
      }
    }

    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias de misiones:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en nivel
const checkLevelBadges = async (userId) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const userLevel = userData?.level || 0;

    const { data: levelBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'level');

    if (badgesError) throw badgesError;
    
    const unlockedBadges = [];

    for (const badge of (levelBadges || [])) {
      if (userLevel >= badge.threshold) {
        try {
          const { data: existingBadge, error: checkError } = await supabase
            .from('user_badges')
            .select('id')
            .eq('userId', userId)
            .eq('badgeId', badge.id)
            .single();
          
          if (!checkError) continue;
          
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert([{
              userId,
              badgeId: badge.id,
              unlocked_at: new Date().toISOString()
            }]);
            
          if (insertError) continue;
          
          unlockedBadges.push(badge.name);
        } catch (error) {
          continue;
        }
      }
    }

    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias de nivel:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en ciudades visitadas
const checkCityBadges = async (userId) => {
  try {
    const { data: journeys, error: journeysError } = await supabase
      .from('journeys')
      .select('cityId')
      .eq('userId', userId);

    if (journeysError) throw journeysError;

    const uniqueCities = new Set(journeys?.map(journey => journey.cityId));
    const citiesCount = uniqueCities.size;

    const { data: cityBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'cities');

    if (badgesError) throw badgesError;
    
    const unlockedBadges = [];

    for (const badge of (cityBadges || [])) {
      if (citiesCount >= badge.threshold) {
        try {
          const { data: existingBadge, error: checkError } = await supabase
            .from('user_badges')
            .select('id')
            .eq('userId', userId)
            .eq('badgeId', badge.id)
            .single();
          
          if (!checkError) continue;
          
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert([{
              userId,
              badgeId: badge.id,
              unlocked_at: new Date().toISOString()
            }]);
            
          if (insertError) continue;
          
          unlockedBadges.push(badge.name);
        } catch (error) {
          continue;
        }
      }
    }

    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias de ciudades:', error);
    return [];
  }
};

// Verificar y otorgar insignias basadas en conexiones sociales
const checkSocialBadges = async (userId) => {
  try {
    if (!userId) return [];
    
    const { count, error: connectionsError } = await supabase
      .from('friends')
      .select('id', { count: 'exact' })
      .eq('user1Id', userId);
    
    if (connectionsError) return [];
    
    const friendsCount = count || 0;
    
    const { data: socialBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'social');
    
    if (badgesError) return [];
    
    const unlockedBadges = [];
    
    for (const badge of (socialBadges || [])) {
      if (friendsCount >= badge.threshold) {
        try {
          const { data: existingBadge, error: checkError } = await supabase
            .from('user_badges')
            .select('id')
            .eq('userId', userId)
            .eq('badgeId', badge.id)
            .single();
          
          if (!checkError) continue;
          
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert([{
              userId,
              badgeId: badge.id,
              unlocked_at: new Date().toISOString()
            }]);
            
          if (insertError) continue;
          
          unlockedBadges.push(badge.name);
        } catch (error) {
          continue;
        }
      }
    }
    
    return unlockedBadges;
  } catch (error) {
    console.error('Error al verificar insignias sociales:', error);
    return [];
  }
};

// Verificar y otorgar la insignia de Fotógrafo Viajero
const checkPhotographerBadge = async (userId) => {
  try {
    if (!userId) return false;

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
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert([{
            userId,
            badgeId: badgeData.id,
            unlocked_at: new Date().toISOString()
          }]);
          
        return !insertError;
      }
    }

    return false;
  } catch {
    return false;
  }
};

// Verificar y otorgar la insignia de Maratonista de Viajes
const checkMarathonBadge = async (userId) => {
  try {
    if (!userId) return false;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    const { count, error } = await supabase
      .from('journeys_missions')
      .select('id', { count: 'exact' })
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);
      
    if (error) return false;
    
    const missionCount = count || 0;
    
    if (missionCount >= 10) {
      const { data: badgeData } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Maratonista de Viajes')
        .single();
      
      if (badgeData?.id) {
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert([{
            userId,
            badgeId: badgeData.id,
            unlocked_at: new Date().toISOString()
          }]);
          
        return !insertError;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar insignia de maratonista:', error);
    return false;
  }
};

// Verificar todas las posibles insignias para un usuario
const checkAllBadges = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
  try {
    const missionBadges = await checkMissionBadges(userId);
    const levelBadges = await checkLevelBadges(userId);
    const cityBadges = await checkCityBadges(userId);
    const socialBadges = await checkSocialBadges(userId);
    
    const photographerResult = await checkPhotographerBadge(userId);
    const marathonResult = await checkMarathonBadge(userId);
    
    let specialBadges = [];
    if (photographerResult || marathonResult) {
      const { data: badgesData } = await supabase
        .from('badges')
        .select('name')
        .in('name', ['Fotógrafo Viajero', 'Maratonista de Viajes']);
      
      specialBadges = badgesData?.map(badge => badge.name) || [];
    }
    
    const allUnlockedBadges = [
      ...missionBadges,
      ...levelBadges,
      ...cityBadges,
      ...socialBadges,
      ...specialBadges
    ];
    
    res.status(200).json({
      success: true,
      unlockedBadges: allUnlockedBadges
    });
  } catch (error) {
    console.error('Error al verificar todas las insignias:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verificar insignia de nueva ciudad y otorgar puntos extra
const checkNewCityBadgeAndAwardPoints = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
  try {
    const newCityBadgeId = 'e733a802-553b-4a69-ae09-9b772dd7f8f1';
    
    const { data: badgeData } = await supabase
      .from('badges')
      .select('name')
      .eq('id', newCityBadgeId)
      .single();
      
    const badgeName = badgeData?.name || 'Explorador de Nuevas Ciudades';
    
    const { data, error } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', newCityBadgeId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({ error: error.message });
    }
    
    if (data) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .single();
      
      if (userError) {
        return res.status(400).json({ error: userError.message });
      }
      
      const currentPoints = userData?.points || 0;
      const newPoints = currentPoints + 500;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
      
      return res.status(200).json({
        success: true,
        alreadyHasBadge: true,
        pointsAwarded: 500,
        badgeName
      });
    }
    
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert([{
        userId,
        badgeId: newCityBadgeId,
        unlocked_at: new Date().toISOString()
      }]);
      
    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }
    
    return res.status(200).json({
      success: true,
      alreadyHasBadge: false,
      pointsAwarded: 0,
      badgeName
    });
  } catch (error) {
    console.error('Error al verificar insignia de nueva ciudad:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar el título personalizado del usuario
const updateUserTitle = async (req, res) => {
  const { userId, title } = req.body;
  
  if (!userId || !title) {
    return res.status(400).json({ error: 'Se requieren userId y title' });
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ custom_title: title })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar título:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Error al actualizar título:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener el título personalizado del usuario
const getUserTitle = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('custom_title')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al obtener título:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json({
      success: true,
      custom_title: data?.custom_title || ''
    });
  } catch (error) {
    console.error('Error al obtener título:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllBadges,
  getUserBadges,
  unlockBadge,
  checkAllBadges,
  checkNewCityBadgeAndAwardPoints,
  updateUserTitle,
  getUserTitle
}; 