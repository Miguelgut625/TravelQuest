import express from 'express';
import cors from 'cors';
import appRoutes from './app'; // Importa las rutas

const app = express();
const PORT = 5000;

app.use(cors()); // Habilita CORS
app.use(express.json()); // Middleware para parsear JSON

// Usa las rutas
app.use('/api', appRoutes);

// La dirección IP debe ser también un tipo de dato string
app.listen(PORT, "192.168.56.1", () => {
  console.log(`Servidor corriendo en http://192.168.56.1:${PORT}`);
});
/* 
http://192.168.56.1:5000/api/users */