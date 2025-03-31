// friendRoutes.js
import { Router } from 'express';
import {obtenerSolicitudesPendientes,aceptarSolicitud} from '../controllers/friendControlles.js';

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes); // Aquí se asume que 'id' es un parámetro en la URL
router.put('/requests/accept/:id',aceptarSolicitud)
export default router;
