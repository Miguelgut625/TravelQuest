const { Router } = require('express');
const { getJourneysMissions,
     getJourneysMissionsById, 
     createJourneysMissions, 
     updateJourneysMissions, 
     deleteJourneysMissions, 
     getJourneysMissionsByUserId, 
     completeJourneysMissions,
     getJourneysMissionsByJourneyId } = require('../controllers/journeyMissionsController.js');

const router = Router();

// Rutas para viajes
router.get('/', getJourneysMissions); // Obtener todas las misiones personales ✓
router.get('/:id', getJourneysMissionsById); // Obtener una mision personal por ID ✓
router.post('/', createJourneysMissions); // Crear una nueva mision personal ✘
router.put('/:id', updateJourneysMissions); // Actualizar una mision personal ✘
router.delete('/:id', deleteJourneysMissions); // Eliminar una mision personal ✘
router.get('/user/:id', getJourneysMissionsByUserId); // Obtener viajes por userId  ✓ (Complejo)
router.put('/:id/complete', completeJourneysMissions); // Completar una mision ✓ 
router.get('/journey/:id', getJourneysMissionsByJourneyId); // Obtener misiones de un viaje ✓

module.exports = router