// friendRoutes.js
const { Router } = require('express');
const {
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud,
  enviarSolicitud,
  obtenerAmigos,
  obtenerAmigosEnComun,
  eliminarAmistad,
  cancelarSolicitud,
  obtenerRankingAmigo
} = require('../controllers/friendControllers.js');

const router = Router();

// Rutas para amigos
router.get('/requests/:id', obtenerSolicitudesPendientes);
router.post('/accept-request/:id', aceptarSolicitud);
router.post('/reject-request/:id', rechazarSolicitud);
router.post('/send-request', enviarSolicitud);
router.get('/friends/:userId', obtenerAmigos);
router.get('/mutual-friends/:userId1/:userId2', obtenerAmigosEnComun);
router.delete('/friendship/:userId1/:userId2', eliminarAmistad);
router.delete('/cancel-request/:senderId/:receiverId', cancelarSolicitud);
router.get('/friend-rank/:friendId', obtenerRankingAmigo);

module.exports = router;
