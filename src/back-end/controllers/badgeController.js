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
    console.log(`Iniciando desbloqueo de insignia: ID=${badgeId} para usuario: ID=${userId}`);
    
    // Verificar si existe la insignia
    const { data: badgeExists, error: badgeError } = await supabase
      .from('badges')
      .select('id, name')
      .eq('id', badgeId)
      .single();
      
    if (badgeError) {
      console.error(`Error al verificar insignia:`, badgeError);
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
      .insert([
        {
          userId,
          badgeId,
          unlocked_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      console.error(`Error al insertar insignia:`, insertError);
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

// Verificar y otorgar todas las posibles insignias para un usuario
const checkAllBadges = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }
  
  try {
    const unlockedBadges = [];
    
    // 1. Verificar insignias de misiones
    const { data: missionStats, error: statsError } = await supabase
      .from('journeys_missions')
      .select('id, completed')
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .count();

    if (statsError) throw statsError;
    const completedMissions = missionStats?.count || 0;
    
    // Obtener insignias de misiones
    const { data: missionBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'missions');

    if (badgesError) throw badgesError;
    
    // Verificar cada insignia de misión
    for (const badge of (missionBadges || [])) {
      if (completedMissions >= badge.threshold) {
        const result = await unlockBadgeForUser(userId, badge.id);
        if (result.success && !result.alreadyHad) {
          unlockedBadges.push(badge.name);
        }
      }
    }
    
    // 2. Verificar insignias de nivel
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();
      
    if (!userError && userData) {
      const { data: levelBadges, error: levelError } = await supabase
        .from('badges')
        .select('*')
        .eq('category', 'level');
        
      if (!levelError) {
        for (const badge of (levelBadges || [])) {
          if (userData.points >= badge.threshold) {
            const result = await unlockBadgeForUser(userId, badge.id);
            if (result.success && !result.alreadyHad) {
              unlockedBadges.push(badge.name);
            }
          }
        }
      }
    }
    
    // 3. Verificar insignias de ciudades
    const { data: cityStats, error: cityError } = await supabase
      .from('user_cities')
      .select('cityId')
      .eq('userId', userId)
      .count();
      
    if (!cityError && cityStats) {
      const { data: cityBadges, error: cityBadgesError } = await supabase
        .from('badges')
        .select('*')
        .eq('category', 'cities');
        
      if (!cityBadgesError) {
        for (const badge of (cityBadges || [])) {
          if (cityStats.count >= badge.threshold) {
            const result = await unlockBadgeForUser(userId, badge.id);
            if (result.success && !result.alreadyHad) {
              unlockedBadges.push(badge.name);
            }
          }
        }
      }
    }
    
    res.status(200).json({
      success: true,
      unlockedBadges: unlockedBadges
    });
  } catch (error) {
    console.error('Error al verificar todas las insignias:', error);
    res.status(500).json({ error: error.message });
  }
};

// Función auxiliar para desbloquear insignia
const unlockBadgeForUser = async (userId, badgeId) => {
  try {
    // Verificar si el usuario ya tiene la insignia
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('userId', userId)
      .eq('badgeId', badgeId)
      .single();

    if (!checkError) {
      return { success: true, alreadyHad: true };
    }
    
    // Insertar la nueva insignia
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert([
        {
          userId,
          badgeId,
          unlocked_at: new Date().toISOString()
        }
      ]);
      
    if (insertError) {
      console.error('Error al insertar badge:', insertError);
      return { success: false, alreadyHad: false };
    }
    
    return { success: true, alreadyHad: false };
  } catch (error) {
    console.error('Error en unlockBadgeForUser:', error);
    return { success: false, alreadyHad: false };
  }
};

module.exports = {
  getAllBadges,
  getUserBadges,
  unlockBadge,
  checkAllBadges
}; 