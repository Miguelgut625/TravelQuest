const express = require('express');
const cors = require('cors');
const appRoutes = require('./app.js'); // Importa las rutas

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS más permisiva
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Middleware para parsear JSON

// Usa las rutas
app.use('/api', appRoutes);

// Escuchar en todas las interfaces de red
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`También accesible en http://192.168.1.185:${PORT}`);
});