// friendRoutes.js
const { Router } = require('express');
const { obtenerSolicitudesPendientes, aceptarSolicitud, rechazarSolicitud, enviarSolicitud } = require('../controllers/friendControlles.js');

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes);
router.get('/accept-requests/:id', aceptarSolicitud);
router.get('/reject-requests/:id', rechazarSolicitud);
router.post('/send-request', enviarSolicitud);

module.exports = router;
