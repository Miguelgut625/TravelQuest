const express = require('express');
const router = express.Router();
const {
  getJourneyById,
  getJourneysByUser,
  createJourney,
  updateJourney,
  deleteJourney,
  shareJourney
} = require('../controllers/journeyController');

// Rutas para viajes
router.get('/:id', getJourneyById);
router.get('/user/:userId', getJourneysByUser);
router.post('/', createJourney);
router.put('/:id', updateJourney);
router.delete('/:id', deleteJourney);
router.post('/:id/share', shareJourney);

module.exports = router;