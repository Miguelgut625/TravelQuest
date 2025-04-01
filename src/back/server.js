import express from 'express';
import cors from 'cors';
import appRoutes from './app.js'; // Importa las rutas

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Habilita CORS
app.use(express.json()); // Middleware para parsear JSON

// Usa las rutas
app.use('/api', appRoutes);

app.listen(PORT, "192.168.56.1",() => {
  console.log(`Servidor corriendo en http://192.168.56.1:${PORT}`);
});