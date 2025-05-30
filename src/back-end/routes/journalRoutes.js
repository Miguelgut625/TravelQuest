const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');

// Obtener todas las entradas del diario de un usuario
router.get('/user/:userId', journalController.getUserJournalEntries);

// Obtener una entrada específica del diario
router.get('/entry/:entryId', journalController.getJournalEntryById);

// Crear una nueva entrada en el diario
router.post('/entry', journalController.createJournalEntry);

// Obtener comentarios de una entrada
router.get('/entry/:entryId/comments', journalController.getCommentsByEntryId);

// Añadir un comentario a una entrada
router.post('/entry/:entryId/comments', journalController.addCommentToEntry);

// Actualizar una entrada con descripción de IA
router.put('/entry/ai-description', journalController.updateJournalWithAIDescription);

// Obtener la configuración de visibilidad de comentarios de un usuario
router.get('/user/:userId/comments-visibility', journalController.getUserCommentsVisibility);

// Verificar si dos usuarios son amigos
router.get('/friendship/:userId1/:userId2', journalController.checkFriendship);

module.exports = router; 