import { supabase } from './supabase';

export interface LeaderboardUser {
  id: string;
  username: string;
  points: number;
  rank: number;
  completedMissions: number;
  visitedCities: number;
}

export const getLeaderboard = async (): Promise<LeaderboardUser[]> => {
  try {
    // Obtener todos los usuarios
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) throw usersError;

    // Obtener las estadísticas de cada usuario
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
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
          .eq('userId', user.id);

        if (journeysError) throw journeysError;

        // Calcular estadísticas
        const stats = {
          totalPoints: 0,
          completedMissions: 0,
          visitedCities: new Set()
        };

        journeys?.forEach((journey: any) => {
          // Añadir la ciudad a las visitadas
          if (journey.cityId) {
            stats.visitedCities.add(journey.cityId);
          }

          // Contar misiones completadas y puntos
          journey.journeys_missions.forEach((mission: any) => {
            if (mission.completed) {
              stats.completedMissions++;
              stats.totalPoints += mission.challenges.points;
            }
          });
        });

        return {
          ...user,
          points: stats.totalPoints,
          completedMissions: stats.completedMissions,
          visitedCities: stats.visitedCities.size
        };
      })
    );

    // Ordenar por puntos, añadir ranking y limitar a los 10 primeros
    const sortedUsers = usersWithStats
      .sort((a, b) => b.points - a.points)
      .slice(0, 10) // Limitar a los 10 primeros
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));

    return sortedUsers;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}; 