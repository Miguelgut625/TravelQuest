import { Router } from 'express';
import cityRoutes from './routes/cityRoutes';
import authRoutes from './routes/authRoutes';
import journeyRoutes from './routes/journeyRoutes';
import challengeRoutes from './routes/challengesRoutes';
import journeyMissionsRoutes from './routes/journeyMissionsRoutes';
import friendRoutes from './routes/friendRoutes';
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