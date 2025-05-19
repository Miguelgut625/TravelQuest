import { supabase } from './supabase';

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
      .eq('userId', userId);

    if (journeysError) {
      throw journeysError;
    }

    // Inicializar estadísticas
    const stats: AdvancedMissionStats = {
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
    const completionTimes: number[] = [];
    const now = new Date();
    
    // Contadores para ciudades
    const cityCounts: Record<string, number> = {};
    const cityNames: Record<string, string> = {};
    
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
          
          // Inferir categoría basada en el título ya que no tenemos category ni type
          const title = mission.challenges.title || '';
          let category = 'Otras';
          
          // Categorizar según palabras clave en el título - Versión ampliada
          const lowerTitle = title.toLowerCase();
          
          // Fotografía
          if (lowerTitle.includes('foto') || lowerTitle.includes('captura') || lowerTitle.includes('imagen') || 
              lowerTitle.includes('selfie')) {
            category = 'Fotografía';
          } 
          // Gastronomía
          else if (lowerTitle.includes('comida') || lowerTitle.includes('gastronomía') || 
                   lowerTitle.includes('restaurante') || lowerTitle.includes('plato') || 
                   lowerTitle.includes('bebida') || lowerTitle.includes('probar') || 
                   lowerTitle.includes('café') || lowerTitle.includes('bar') ||
                   lowerTitle.includes('tapa')) {
            category = 'Gastronomía';
          } 
          // Cultura
          else if (lowerTitle.includes('museo') || lowerTitle.includes('exposición') || 
                   lowerTitle.includes('teatro') || lowerTitle.includes('concierto') ||
                   lowerTitle.includes('festival') || lowerTitle.includes('tradición') ||
                   lowerTitle.includes('cultural')) {
            category = 'Cultura';
          } 
          // Arte
          else if (lowerTitle.includes('arte') || lowerTitle.includes('pintura') || 
                   lowerTitle.includes('escultura') || lowerTitle.includes('galería') ||
                   lowerTitle.includes('artista')) {
            category = 'Arte';
          }
          // Historia
          else if (lowerTitle.includes('monumento') || lowerTitle.includes('histórico') || 
                   lowerTitle.includes('historia') || lowerTitle.includes('sitio') || 
                   lowerTitle.includes('ruinas') || lowerTitle.includes('antiguo') ||
                   lowerTitle.includes('castillo')) {
            category = 'Historia';
          } 
          // Naturaleza
          else if (lowerTitle.includes('parque') || lowerTitle.includes('jardín') || 
                   lowerTitle.includes('natural') || lowerTitle.includes('montaña') ||
                   lowerTitle.includes('río') || lowerTitle.includes('bosque') || 
                   lowerTitle.includes('lago')) {
            category = 'Naturaleza';
          }
          // Arquitectura
          else if (lowerTitle.includes('arquitectura') || lowerTitle.includes('edificio') || 
                   lowerTitle.includes('construcción') || lowerTitle.includes('catedral') || 
                   lowerTitle.includes('iglesia') || lowerTitle.includes('palacio') ||
                   lowerTitle.includes('torre')) {
            category = 'Arquitectura';
          }
          // Aventura
          else if (lowerTitle.includes('aventura') || lowerTitle.includes('actividad') || 
                   lowerTitle.includes('deporte') || lowerTitle.includes('juego') ||
                   lowerTitle.includes('reto') || lowerTitle.includes('desafío')) {
            category = 'Aventura';
          }
          // Compras
          else if (lowerTitle.includes('compra') || lowerTitle.includes('tienda') || 
                   lowerTitle.includes('mercado') || lowerTitle.includes('souvenir') ||
                   lowerTitle.includes('artesanía')) {
            category = 'Compras';
          }
          // Social
          else if (lowerTitle.includes('gente') || lowerTitle.includes('local') || 
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
    
    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas avanzadas:', error);
    throw error;
  }
}; 