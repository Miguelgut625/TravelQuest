import { supabase } from './supabase';

/**
 * Calcula la cantidad de XP necesaria para el siguiente nivel
 * @param level Nivel actual del usuario
 * @returns Cantidad de XP necesaria para el siguiente nivel
 */
export const calculateNextLevelXP = (level: number): number => {
  return (level + 1) * 50;
};

/**
 * Calcula el nivel basado en la cantidad de puntos
 * @param points Puntos totales del usuario
 * @returns Nivel calculado
 */
export const calculateLevel = (points: number): number => {
  // Fórmula: nivel = max(1, floor(sqrt(points / 25)))
  return Math.max(1, Math.floor(Math.sqrt(points / 25)));
};

/**
 * Calcula la XP actual dentro del nivel
 * @param points Puntos totales del usuario
 * @param level Nivel actual
 * @returns XP actual dentro del nivel
 */
export const calculateCurrentXP = (points: number, level: number): number => {
  // XP actual = puntos % (nivel * 50)
  return points % (level * 50);
};

/**
 * Añade experiencia a un usuario y actualiza su nivel si es necesario
 * @param userId ID del usuario
 * @param xpToAdd Cantidad de XP a añadir
 * @returns Objeto con información del usuario actualizado, incluye si subió de nivel
 */
export const addExperienceToUser = async (userId: string, xpToAdd: number) => {
  try {
    // Obtener datos actuales del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points, level, xp, xp_next')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    if (!userData) {
      throw new Error('Usuario no encontrado');
    }
    
    const { points, level, xp, xp_next } = userData;
    
    // Calcular nuevos puntos
    const newPoints = points + xpToAdd;
    
    // Actualizar los puntos del usuario
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId)
      .select('points, level, xp, xp_next')
      .single();
      
    if (updateError) throw updateError;
    
    if (!updatedUser) {
      throw new Error('Error al actualizar el usuario');
    }

    // Comprobar si el usuario ha subido de nivel
    const leveledUp = updatedUser.level > level;
    
    return {
      ...updatedUser,
      leveledUp,
      oldLevel: level,
      xpGained: xpToAdd,
      remainingXP: updatedUser.xp_next - updatedUser.xp
    };
  } catch (error) {
    console.error('Error al añadir experiencia:', error);
    throw error;
  }
}; 