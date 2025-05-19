import { Router } from 'express';
import { getUserBadges, checkBadges } from '../controllers/badgeController';

const router = Router();

// Rutas de insignias
router.get('/user/:userId', getUserBadges);
router.get('/check/:userId', checkBadges);

export default router; 