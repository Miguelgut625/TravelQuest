import { supabase } from './supabase';

export const getUserPoints = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data?.points || 0;
  } catch (error) {
    console.error('Error obteniendo puntos del usuario:', error);
    throw error;
  }
};

export const addPointsToUser = async (userId: string, points: number) => {
  try {
    // Primero obtenemos los puntos actuales
    const currentPoints = await getUserPoints(userId);
    
    // Actualizamos los puntos
    const { error } = await supabase
      .from('users')
      .update({
        points: currentPoints + points,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return currentPoints + points;
  } catch (error) {
    console.error('Error añadiendo puntos al usuario:', error);
    throw error;
  }
};

export const completeMission = async (missionId: string, userId: string) => {
  try {
    // Primero obtenemos los puntos de la misión
    const { data: mission, error: missionError } = await supabase
      .from('journeys_missions')
      .select(`
        challenge:challenges (
          points
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError) throw missionError;

    // Marcar la misión como completada
    const { error: updateError } = await supabase
      .from('journeys_missions')
      .update({ completed: true })
      .eq('id', missionId);

    if (updateError) throw updateError;

    // Añadir los puntos al usuario
    const points = mission.challenge.points;
    await addPointsToUser(userId, points);

    return points;
  } catch (error) {
    console.error('Error completando la misión:', error);
    throw error;
  }
}; 