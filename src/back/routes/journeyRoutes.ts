import { Router } from 'express';
import { getJourneys, getJourneyById, createJourney, updateJourney, deleteJourney, getJourneysByUserId } from '../controllers/journeysController';

const router = Router();

// Rutas para viajes
router.get('/', getJourneys); // Obtener todos los viajes ✓
router.get('/:id', getJourneyById); // Obtener un viaje por ID ✓
router.post('/', createJourney); // Crear un nuevo viaje ✘
router.put('/:id', updateJourney); // Actualizar un viaje ✘
router.delete('/:id', deleteJourney); // Eliminar un viaje ✘
router.get('/user/:id', getJourneysByUserId); // Obtener viajes por userId ✓

export default router