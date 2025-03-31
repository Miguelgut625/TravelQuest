// friendRoutes.js
import { Router } from 'express';
import { obtenerSolicitudesPendientes, aceptarSolicitud, rechazarSolicitud, enviarSolicitud } from '../controllers/friendControlles.js';

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes);
router.get('/accept-requests/:id', aceptarSolicitud);
router.get('/reject-requests/:id', rechazarSolicitud);
router.post('/send-request', enviarSolicitud);

export default router;
