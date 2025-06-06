import { supabase } from './supabase';
import NotificationService from './NotificationService';

/**
 * Calcula la experiencia necesaria para el siguiente nivel
 * @param currentLevel Nivel actual del usuario
 * @returns XP necesaria para subir al siguiente nivel
 */
export const calculateNextLevelXP = (currentLevel: number): number => {
  // Fórmula simple para calcular XP del siguiente nivel
  // Según la tabla de usuarios, el mínimo es 50
  return Math.max(50, (currentLevel + 1) * 50);
};

/**
 * Obtiene el nivel y experiencia actual del usuario
 * @param userId ID del usuario
 * @returns Objeto con nivel, experiencia actual y experiencia para siguiente nivel
 */
export const getUserLevelAndXP = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('level, xp, xp_next')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      level: data?.level || 1,
      xp: data?.xp || 0,
      xpNext: data?.xp_next || 50
    };
  } catch (error) {
    console.error('Error obteniendo nivel y XP del usuario:', error);
    return { level: 1, xp: 0, xpNext: 50 };
  }
};

/**
 * Añade experiencia al usuario y sube de nivel si corresponde
 * @param userId ID del usuario
 * @param experience Cantidad de experiencia a añadir
 * @returns Objeto con el nuevo nivel y experiencia
 */
export const addExperienceToUser = async (userId: string, experience: number) => {
  try {
    // Obtener nivel, XP y XP para el siguiente nivel actuales
    const { level: currentLevel, xp: currentXP, xpNext } = await getUserLevelAndXP(userId);
    
    // Convertir a números para asegurar cálculos correctos
    const numCurrentLevel = Number(currentLevel);
    const numCurrentXP = Number(currentXP);
    const numXPNext = Number(xpNext);
    
    // Calcular la nueva XP
    let newXP = numCurrentXP + experience;
    
    // Calcular si hay que subir de nivel
    let newLevel = numCurrentLevel;
    let remainingXP = newXP;
    let newXPNext = numXPNext;
    let leveledUp = false;
    
    // Mientras la XP supere lo necesario para el siguiente nivel, subir de nivel
    while (remainingXP >= newXPNext) {
      remainingXP -= newXPNext;
      newLevel++;
      leveledUp = true;
      newXPNext = calculateNextLevelXP(newLevel);
    }
    
    // Actualizar en la base de datos
    const { error } = await supabase
      .from('users')
      .update({
        level: newLevel,
        xp: remainingXP,
        xp_next: newXPNext,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Enviar notificación si subió de nivel
    if (leveledUp) {
      try {
        const notificationService = NotificationService.getInstance();
        // Obtener puntos actuales del usuario para la notificación
        const { data: userData } = await supabase
          .from('users')
          .select('points')
          .eq('id', userId)
          .single();
        
        await notificationService.notifyLevelUp(
          userId,
          newLevel,
          userData?.points || 0
        );
        console.log(`✅ Notificación de subida de nivel enviada: Nivel ${newLevel}`);
      } catch (notificationError) {
        console.error('Error enviando notificación de subida de nivel:', notificationError);
        // No afectar el flujo principal si falla la notificación
      }
    }

    return {
      level: newLevel,
      xp: remainingXP,
      xpNext: newXPNext,
      leveledUp: leveledUp
    };
  } catch (error) {
    console.error('Error añadiendo experiencia al usuario:', error);
    throw error;
  }
}; 