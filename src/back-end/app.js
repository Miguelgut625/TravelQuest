const { Router } = require('express');
const cityRoutes = require('./routes/cityRoutes.js');
const authRoutes = require('./routes/authRoutes.js');
const challengeRoutes = require('./routes/challengesRoutes.js');
const friendRoutes = require('./routes/friendRoutes.js');
const badgeRoutes = require('./routes/badgeRoutes.js');
const leaderboardRoutes = require('./routes/leaderboardRoutes.js');
const router = Router();

// Rutas
//router.use('/journal', journalRoutes);
router.use('/challenges', challengeRoutes);
router.use('/cities', cityRoutes);
router.use('/users', authRoutes);
router.use('/friends', friendRoutes);
router.use('/badges', badgeRoutes);
router.use('/leaderboard', leaderboardRoutes);

module.exports = router;