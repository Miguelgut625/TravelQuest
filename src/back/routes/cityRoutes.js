import { Router } from 'express';
import { getCities, getCityById, createCity, updateCity, deleteCity } from '../controllers/cityController.js';

const router = Router();

// Rutas para ciudades
router.get('/', getCities); // Obtener todas las ciudades ✓ 
router.get('/:id', getCityById); // Obtener una ciudad por ID ✓
router.post('/', createCity); // Crear una nueva ciudad ✘
router.put('/:id', updateCity); // Actualizar una ciudad ✘
router.delete('/:id', deleteCity); // Eliminar una ciudad ✘

export default router;