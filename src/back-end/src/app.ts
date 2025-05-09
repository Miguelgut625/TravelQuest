import { Express, Request, Response, NextFunction } from 'express';
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const badgeRoutes = require('./routes/badge.routes');

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/badges', badgeRoutes);

// Manejo de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

module.exports = app; 