import { Router } from 'express';
import cityRoutes from './routes/cityRoutes';
//import authRoutes from './routes/authRoutes';
//import journalRoutes from './routes/journalRoutes';
//import missionRoutes from './routes/missionRoutes';
//import cityRoutes from './routes/cityRoutes';

const router = Router();

// Rutas
//router.use('/auth', authRoutes);
//router.use('/journal', journalRoutes);
//router.use('/missions', missionRoutes);
router.use('/cities', cityRoutes);

export default router;