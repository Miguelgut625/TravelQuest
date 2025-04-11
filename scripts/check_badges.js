// Script para verificar y otorgar logros a los usuarios
// Este script se puede programar para ejecutarse periódicamente

import { supabase } from '../src/services/supabase.js';
import { 
  checkMissionBadges, 
  checkLevelBadges, 
  checkCityBadges, 
  awardSpecificBadges 
} from '../src/services/badgeService.js';

/**
 * Verifica y otorga todos los logros posibles para un usuario
 * @param {string} userId - ID del usuario a verificar
 */
async function checkAllBadgesForUser(userId) {
  try {
    console.log(`Verificando logros para usuario: ${userId}`);
    
    // Verificar las diferentes categorías de logros en paralelo
    const [missionBadges, levelBadges, cityBadges] = await Promise.all([
      checkMissionBadges(userId),
      checkLevelBadges(userId),
      checkCityBadges(userId)
    ]);
    
    // Combinar los resultados
    const awardedBadges = [
      ...missionBadges,
      ...levelBadges,
      ...cityBadges
    ];
    
    if (awardedBadges.length > 0) {
      console.log(`Usuario ${userId} obtuvo ${awardedBadges.length} logros nuevos:`);
      awardedBadges.forEach(badge => console.log(`- ${badge}`));
      
      // Crear notificación para el usuario sobre los nuevos logros
      try {
        await supabase
          .from('notifications')
          .insert({
            userId,
            title: '¡Nuevos logros desbloqueados!',
            message: `Has desbloqueado ${awardedBadges.length} logros nuevos. ¡Revisa tu perfil para verlos!`,
            type: 'achievement',
            read: false,
            created_at: new Date().toISOString()
          });
      } catch (notifyError) {
        console.error('Error al crear notificación:', notifyError);
      }
    } else {
      console.log(`Usuario ${userId} no obtuvo nuevos logros`);
    }
    
    return awardedBadges;
  } catch (error) {
    console.error(`Error verificando logros para usuario ${userId}:`, error);
    return [];
  }
}

/**
 * Verificar logros para todos los usuarios
 */
async function checkAllUsersLogros() {
  try {
    console.log('Iniciando verificación de logros para todos los usuarios...');
    
    // Obtener todos los usuarios activos
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('active', true);
    
    if (error) {
      throw error;
    }
    
    console.log(`Verificando logros para ${users.length} usuarios`);
    
    // Procesar cada usuario secuencialmente para evitar sobrecarga
    for (const user of users) {
      await checkAllBadgesForUser(user.id);
    }
    
    console.log('Verificación de logros completada');
  } catch (error) {
    console.error('Error al verificar logros para todos los usuarios:', error);
  }
}

// Si se ejecuta directamente este script
if (require.main === module) {
  checkAllUsersLogros()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error en el proceso principal:', error);
      process.exit(1);
    });
}

// Exportar funciones para uso desde otros scripts
export {
  checkAllBadgesForUser,
  checkAllUsersLogros
}; 