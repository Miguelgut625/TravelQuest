const { Router } = require('express');
const { 
  getAllBadges, 
  getUserBadges, 
  unlockBadge, 
  checkAllBadges,
  checkNewCityBadgeAndAwardPoints,
  updateUserTitle,
  getUserTitle
} = require('../controllers/badgeController.js');

const router = Router();

// Rutas para badges
router.get('/', getAllBadges); // Obtener todas las insignias
router.get('/user/:userId', getUserBadges); // Obtener las insignias de un usuario
router.post('/unlock', unlockBadge); // Desbloquear una insignia para un usuario
router.get('/check/:userId', checkAllBadges); // Verificar y otorgar todas las insignias posibles
router.get('/check-new-city/:userId', checkNewCityBadgeAndAwardPoints); // Verificar insignia de nueva ciudad y otorgar puntos extra
router.post('/update-title', updateUserTitle); // Actualizar título personalizado del usuario
router.get('/user-title/:userId', getUserTitle); // Obtener título personalizado del usuario

module.exports = router; 