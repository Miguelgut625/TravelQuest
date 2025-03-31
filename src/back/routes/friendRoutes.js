// friendRoutes.js
import { Router } from 'express';
import { obtenerSolicitudesPendientes, aceptarSolicitud,rechazarSolicitud } from '../controllers/friendControlles.js';

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes);
router.get('/accept-requests/:id', aceptarSolicitud);
router.get('/reject-requests/:id', rechazarSolicitud);

export default router;
