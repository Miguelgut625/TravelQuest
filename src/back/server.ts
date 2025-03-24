import express from 'express';
import cors from 'cors';
import appRoutes from './routes'; // Importa las rutas

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Habilita CORS
app.use(express.json()); // Middleware para parsear JSON

// Usa las rutas
app.use('/api', appRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});