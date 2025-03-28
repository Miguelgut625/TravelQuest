// friendRoutes.js
import { Router } from 'express';
import obtenerSolicitudesPendientes from '../controllers/friendControlles.js';

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes); // Aquí se asume que 'id' es un parámetro en la URL

export default router;
