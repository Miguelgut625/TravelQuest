import { Router } from 'express';
import {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserPoints,
  updateUserPoints,
  searchUsers
} from '../controllers/userController.js';

const router = Router();

router.get('/search', searchUsers);
router.get('/:userId', getUserById);
router.post('/', createUser);
router.put('/:userId', updateUser);
router.delete('/:userId', deleteUser);
router.get('/:userId/points', getUserPoints);
router.put('/:userId/points', updateUserPoints);

export default router; 