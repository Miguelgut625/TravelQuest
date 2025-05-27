const { supabase } = require('../../services/supabase.server.js');

// Obtener estadísticas del usuario
const getUserStats = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener los puntos, nivel y XP del usuario
    const { data: userPointsData, error: userPointsError } = await supabase
      .from('users')
      .select('points, level, xp, xp_next')
      .eq('id', id)
      .single();

    if (userPointsError) throw userPointsError;

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
      .eq('userId', id);

    if (journeysError) throw journeysError;

    // Calcular estadísticas
    const stats = {
      totalPoints: 0,
      completedMissions: 0,
      visitedCities: new Set()
    };

    journeys?.forEach((journey) => {
      if (journey.cityId) {
        stats.visitedCities.add(journey.cityId);
      }

      journey.journeys_missions.forEach((mission) => {
        if (mission.completed) {
          stats.completedMissions++;
          stats.totalPoints += mission.challenges.points;
        }
      });
    });

    res.status(200).json({
      points: userPointsData?.points || 0,
      level: userPointsData?.level || 1,
      xp: userPointsData?.xp || 0,
      xpNext: userPointsData?.xp_next || 50,
      completedMissions: stats.completedMissions,
      visitedCities: stats.visitedCities.size
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener configuración de privacidad
const getPrivacySettings = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('profile_visibility, friends_visibility, comments_visibility')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json({
      profileVisibility: data?.profile_visibility || 'public',
      friendsVisibility: data?.friends_visibility || 'public',
      commentsVisibility: data?.comments_visibility || 'public'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar configuración de privacidad
const updatePrivacySettings = async (req, res) => {
  const { id } = req.params;
  const { type, visibility } = req.body;

  if (!['profile', 'friends', 'comments'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de privacidad inválido' });
  }

  if (!['public', 'friends', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Nivel de visibilidad inválido' });
  }

  try {
    const field = `${type}_visibility`;
    const { error } = await supabase
      .from('users')
      .update({ [field]: visibility })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Configuración de privacidad actualizada' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener insignias del usuario
const getUserBadges = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        badges (
          id,
          name,
          description,
          image_url
        )
      `)
      .eq('user_id', id);

    if (error) throw error;

    res.status(200).json(data.map(item => item.badges));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener título personalizado
const getCustomTitle = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('custom_title')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json({ customTitle: data?.custom_title || '' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar título personalizado
const updateCustomTitle = async (req, res) => {
  const { id } = req.params;
  const { customTitle } = req.body;

  try {
    const { error } = await supabase
      .from('users')
      .update({ custom_title: customTitle })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Título actualizado' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener estadísticas avanzadas
const getAdvancedStats = async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener todos los journeys del usuario con sus misiones e información de ciudades
    const { data: journeysData, error: journeysError } = await supabase
      .from('journeys')
      .select(`
        id,
        created_at,
        end_date,
        cityId,
        cities (
          id,
          name
        ),
        journeys_missions (
          id,
          completed,
          completed_at,
          created_at,
          challenges (
            id,
            title,
            points
          )
        )
      `)
      .eq('userId', id);

    if (journeysError) throw journeysError;

    // Inicializar estadísticas
    const stats = {
      totalMissions: 0,
      completedMissions: 0,
      pendingMissions: 0,
      expiredMissions: 0,
      completionRate: 0,
      pointsEarned: 0,
      averageTimeToComplete: 0,
      completedByCategory: {},
      mostCompletedCategory: '',
      topCities: []
    };

    // Arrays para cálculos
    const completionTimes = [];
    const now = new Date();
    
    // Contadores para ciudades
    const cityCounts = {};
    const cityNames = {};
    
    // Procesar datos - Usaremos el título de la misión para inferir categorías
    journeysData?.forEach(journey => {
      const journeyEndDate = journey.end_date ? new Date(journey.end_date) : null;
      
      // Contabilizar misiones por ciudad
      const cityId = journey.cityId;
      if (cityId) {
        const cityName = journey.cities?.name || 'Ciudad desconocida';
        cityNames[cityId] = cityName;
        
        // Inicializar contador si no existe
        if (!cityCounts[cityId]) {
          cityCounts[cityId] = 0;
        }
      }
      
      journey.journeys_missions.forEach(mission => {
        stats.totalMissions++;
        
        // Incrementar contador de ciudad si la misión está completada
        if (mission.completed && cityId) {
          cityCounts[cityId]++;
        }
        
        if (mission.completed) {
          stats.completedMissions++;
          stats.pointsEarned += mission.challenges.points || 0;
          
          // Tiempo para completar
          if (mission.completed_at && mission.created_at) {
            const completedAt = new Date(mission.completed_at);
            const createdAt = new Date(mission.created_at);
            const timeToComplete = (completedAt.getTime() - createdAt.getTime()) / (1000 * 3600 * 24); // en días
            completionTimes.push(timeToComplete);
          }
          
          // Inferir categoría basada en el título
          const title = mission.challenges.title || '';
          let category = 'Otras';
          
          // Categorizar según palabras clave en el título
          const lowerTitle = title.toLowerCase();
          
          if (lowerTitle.includes('foto') || lowerTitle.includes('captura') || lowerTitle.includes('imagen') || 
              lowerTitle.includes('selfie')) {
            category = 'Fotografía';
          } else if (lowerTitle.includes('comida') || lowerTitle.includes('gastronomía') || 
                     lowerTitle.includes('restaurante') || lowerTitle.includes('plato') || 
                     lowerTitle.includes('bebida') || lowerTitle.includes('probar') || 
                     lowerTitle.includes('café') || lowerTitle.includes('bar') ||
                     lowerTitle.includes('tapa')) {
            category = 'Gastronomía';
          } else if (lowerTitle.includes('museo') || lowerTitle.includes('exposición') || 
                     lowerTitle.includes('teatro') || lowerTitle.includes('concierto') ||
                     lowerTitle.includes('festival') || lowerTitle.includes('tradición') ||
                     lowerTitle.includes('cultural')) {
            category = 'Cultura';
          } else if (lowerTitle.includes('arte') || lowerTitle.includes('pintura') || 
                     lowerTitle.includes('escultura') || lowerTitle.includes('galería') ||
                     lowerTitle.includes('artista')) {
            category = 'Arte';
          } else if (lowerTitle.includes('monumento') || lowerTitle.includes('histórico') || 
                     lowerTitle.includes('historia') || lowerTitle.includes('sitio') || 
                     lowerTitle.includes('ruinas') || lowerTitle.includes('antiguo') ||
                     lowerTitle.includes('castillo')) {
            category = 'Historia';
          } else if (lowerTitle.includes('parque') || lowerTitle.includes('jardín') || 
                     lowerTitle.includes('natural') || lowerTitle.includes('montaña') ||
                     lowerTitle.includes('río') || lowerTitle.includes('bosque') || 
                     lowerTitle.includes('lago')) {
            category = 'Naturaleza';
          } else if (lowerTitle.includes('arquitectura') || lowerTitle.includes('edificio') || 
                     lowerTitle.includes('construcción') || lowerTitle.includes('catedral') || 
                     lowerTitle.includes('iglesia') || lowerTitle.includes('palacio') ||
                     lowerTitle.includes('torre')) {
            category = 'Arquitectura';
          } else if (lowerTitle.includes('aventura') || lowerTitle.includes('actividad') || 
                     lowerTitle.includes('deporte') || lowerTitle.includes('juego') ||
                     lowerTitle.includes('reto') || lowerTitle.includes('desafío')) {
            category = 'Aventura';
          } else if (lowerTitle.includes('compra') || lowerTitle.includes('tienda') || 
                     lowerTitle.includes('mercado') || lowerTitle.includes('souvenir') ||
                     lowerTitle.includes('artesanía')) {
            category = 'Compras';
          } else if (lowerTitle.includes('gente') || lowerTitle.includes('local') || 
                     lowerTitle.includes('conocer') || lowerTitle.includes('habitante') ||
                     lowerTitle.includes('comunidad')) {
            category = 'Social';
          }
          
          // Actualizar contadores
          stats.completedByCategory[category] = (stats.completedByCategory[category] || 0) + 1;
        } else {
          // Verificar si ha expirado
          if (journeyEndDate && journeyEndDate < now) {
            stats.expiredMissions++;
          } else {
            stats.pendingMissions++;
          }
        }
      });
    });
    
    // Calcular estadísticas derivadas
    if (stats.totalMissions > 0) {
      stats.completionRate = Math.round((stats.completedMissions / stats.totalMissions) * 100);
    }
    
    if (completionTimes.length > 0) {
      const sumTimes = completionTimes.reduce((sum, time) => sum + time, 0);
      stats.averageTimeToComplete = Math.round((sumTimes / completionTimes.length) * 10) / 10;
    }
    
    // Encontrar la categoría más completada
    let maxCount = 0;
    Object.entries(stats.completedByCategory).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stats.mostCompletedCategory = category;
      }
    });
    
    // Obtener el top 3 de ciudades
    const topCities = Object.entries(cityCounts)
      .map(([cityId, count]) => ({
        name: cityNames[cityId] || 'Ciudad desconocida',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    stats.topCities = topCities;
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener foto de perfil
const getProfilePicture = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('profile_pic_url')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json({ profile_pic_url: data?.profile_pic_url || null });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar foto de perfil
const updateProfilePicture = async (req, res) => {
  const { id } = req.params;
  const { profile_pic_url } = req.body;

  if (!profile_pic_url) {
    return res.status(400).json({ error: 'Se requiere la URL de la imagen' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ profile_pic_url })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Foto de perfil actualizada' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getUserStats,
  getPrivacySettings,
  updatePrivacySettings,
  getUserBadges,
  getCustomTitle,
  updateCustomTitle,
  getAdvancedStats,
  getProfilePicture,
  updateProfilePicture
}; 