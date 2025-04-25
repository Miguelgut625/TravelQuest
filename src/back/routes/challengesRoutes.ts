import { Router } from 'express';
import { getChallenges,
     getChallengeById, 
     createChallenge, 
     updateChallenge, 
     deleteChallenge, 
     getChallengesPoints,
      } from '../controllers/challengesController';

const router = Router();

// Rutas para ciudades
router.get('/', getChallenges); // Obtener todas las misión ✓
router.get('/:id', getChallengeById); // Obtener una misión por ID  ✓
router.post('/', createChallenge); // Crear una nueva misión ✘
router.put('/:id', updateChallenge); // Actualizar una misión ✘
router.delete('/:id', deleteChallenge); // Eliminar una misión ✘
router.get('/:id/points', getChallengesPoints); // Obtener puntuacion de la misión ✓

export default router;