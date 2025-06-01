const express = require('express');
const router = express.Router();
const {
  getMissionsByCityAndDuration,
  getMissionHint,
  generateMission,
  getEventMissions,
  getUserEventMissions,
  acceptEventMission
} = require('../controllers/missionController');

// Rutas para misiones
router.get('/city', getMissionsByCityAndDuration);
router.get('/hint/:userId/:missionId', getMissionHint);
router.post('/generate', generateMission);

// Nuevas rutas para misiones de evento
router.get('/events', getEventMissions);
router.get('/events/user/:userId', getUserEventMissions);
router.post('/events/:userId/:missionId/accept', acceptEventMission);

module.exports = router; 