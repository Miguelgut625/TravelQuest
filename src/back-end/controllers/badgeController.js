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
    
    // Verificar si existe la insignia en la tabla badges
    console.log(`Verificando si la insignia ${badgeId} existe...`);
    const { data: badgeExists, error: badgeError } = await supabase
      .from('badges')
      .select('id, name')
      .eq('id', badgeId)
      .single();
      
    if (badgeError) {
      console.error(`Error al verificar si la insignia ${badgeId} existe:`, badgeError);
      return res.status(400).json({ error: badgeError.message });
    }
    
    if (!badgeExists) {
      console.error(`La insignia con ID ${badgeId} no existe en la tabla badges`);
      return res.status(404).json({ error: 'La insignia no existe' });
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
        return res.status(400).json({ error: checkError.message });
      }
    } else {
      // Si ya tiene la insignia, informar y devolver éxito
      console.log(`El usuario ${userId} ya tiene la insignia ${badgeId} - No se realizarán cambios`);
      return res.status(200).json({ 
        success: true, 
        message: 'El usuario ya tiene esta insignia',
        alreadyHad: true
      });
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
      return res.status(400).json({ error: insertError.message });
    }
    
    console.log(`¡Insignia otorgada exitosamente! Datos insertados:`, insertData);
    
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
    // Obtener todas las insignias que el usuario podría desbloquear
    const unlockedBadges = await checkUserEligibility(userId);
    
    res.status(200).json({
      success: true,
      unlockedBadges: unlockedBadges || []
    });
  } catch (error) {
    console.error('Error al verificar todas las insignias:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verificar elegibilidad del usuario para todas las insignias
const checkUserEligibility = async (userId) => {
  try {
    // Este sería el lugar para implementar toda la lógica de verificación
    // que ya tienes en badgeService.ts
    
    // Por ejemplo, verificar misiones completadas
    const { data: missionStats, error: statsError } = await supabase
      .from('journeys_missions')
      .select('id, completed')
      .eq('journeys.userId', userId)
      .eq('completed', true)
      .count();

    if (statsError) throw statsError;

    const completedMissions = missionStats?.count || 0;
    
    // Obtener insignias de misiones que el usuario podría desbloquear
    const { data: missionBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('category', 'missions');

    if (badgesError) throw badgesError;
    
    const unlockedBadges = [];
    
    // Intentar desbloquear cada insignia elegible
    for (const badge of (missionBadges || [])) {
      if (completedMissions >= badge.threshold) {
        try {
          // Verificar si el usuario ya tiene esta insignia
          const { data: existingBadge, error: checkError } = await supabase
            .from('user_badges')
            .select('id')
            .eq('userId', userId)
            .eq('badgeId', badge.id)
            .single();
          
          // Si no hay error, el usuario ya tiene la insignia
          if (!checkError) {
            continue;
          }
          
          // Si el error no es "no data found", algo salió mal
          if (checkError.code !== 'PGRST116') {
            console.error('Error al verificar badge existente:', checkError);
            continue;
          }
          
          // Insertar la nueva insignia
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert([
              {
                userId,
                badgeId: badge.id,
                unlocked_at: new Date().toISOString()
              }
            ]);
            
          if (insertError) {
            console.error('Error al insertar badge:', insertError);
            continue;
          }
          
          unlockedBadges.push(badge.name);
        } catch (error) {
          console.error('Error procesando badge:', error);
          continue;
        }
      }
    }
    
    return unlockedBadges;
  } catch (error) {
    console.error('Error en checkUserEligibility:', error);
    return [];
  }
};

module.exports = {
  getAllBadges,
  getUserBadges,
  unlockBadge,
  checkAllBadges
}; 