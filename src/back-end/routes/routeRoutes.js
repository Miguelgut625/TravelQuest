const express = require('express');
const router = express.Router();
const {
  getRouteById,
  getRoutesByJourney,
  createRoute,
  updateRoute,
  deleteRoute
} = require('../controllers/routeController');

// Rutas para rutas
router.get('/:id', getRouteById);
router.get('/journey/:journeyId', getRoutesByJourney);
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

module.exports = router; 