import { Router } from 'express';
import cityRoutes from './routes/cityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import journeyRoutes from './routes/journeyRoutes.js';
import challengeRoutes from './routes/challengesRoutes.js';
import journeyMissionsRoutes from './routes/journeyMissionsRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
const router = Router();

// Rutas
//router.use('/journal', journalRoutes);
router.use('/challenges', challengeRoutes);
router.use('/cities', cityRoutes);
router.use('/journeys', journeyRoutes);
router.use('/users', authRoutes);
router.use('/journeysMissions', journeyMissionsRoutes);
router.use('/friends', friendRoutes);

export default router;