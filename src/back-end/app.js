const express = require('express');
const cors = require('cors');
const cityRoutes = require('./routes/cityRoutes.js');
const authRoutes = require('./routes/authRoutes.js');
const challengeRoutes = require('./routes/challengesRoutes.js');
const friendRoutes = require('./routes/friendRoutes.js');
const badgeRoutes = require('./routes/badgeRoutes.js');
const leaderboardRoutes = require('./routes/leaderboardRoutes.js');
const journalRoutes = require('./routes/journalRoutes.js');
const profileRoutes = require('./routes/profileRoutes');
const missionRoutes = require('./routes/missionRoutes.js');
const routeRoutes = require('./routes/routeRoutes.js');
const journeyRoutes = require('./routes/journeyRoutes.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/journal', journalRoutes);
app.use('/challenges', challengeRoutes);
app.use('/cities', cityRoutes);
app.use('/users', authRoutes);
app.use('/friends', friendRoutes);
app.use('/badges', badgeRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/profile', profileRoutes);
app.use('/missions', missionRoutes);
app.use('/routes', routeRoutes);
app.use('/journeys', journeyRoutes);

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

module.exports = app;