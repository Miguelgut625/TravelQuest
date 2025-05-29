const express = require('express');
const router = express.Router();
const {
  getMissionsByCityAndDuration,
  getMissionHint,
  generateMission
} = require('../controllers/missionController');

// Rutas para misiones
router.get('/city', getMissionsByCityAndDuration);
router.get('/hint/:userId/:missionId', getMissionHint);
router.post('/generate', generateMission);

module.exports = router; 