const { Router } = require('express');
const {
  getUserStats,
  getPrivacySettings,
  updatePrivacySettings,
  getUserBadges,
  getCustomTitle,
  updateCustomTitle,
  getAdvancedStats,
  getProfilePicture,
  updateProfilePicture
} = require('../controllers/profileController');

const router = Router();

// Rutas de estadísticas
router.get('/:id/stats', getUserStats);
router.get('/:id/advanced-stats', getAdvancedStats);

// Rutas de privacidad
router.get('/:id/privacy', getPrivacySettings);
router.put('/:id/privacy', updatePrivacySettings);

// Rutas de insignias
router.get('/:id/badges', getUserBadges);

// Rutas de título personalizado
router.get('/:id/title', getCustomTitle);
router.put('/:id/title', updateCustomTitle);

// Rutas de foto de perfil
router.get('/:id/picture', getProfilePicture);
router.put('/:id/picture', updateProfilePicture);

module.exports = router; 