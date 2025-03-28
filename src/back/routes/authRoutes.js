import { Router } from 'express';
import { getUsers,
     getUserById,
      createUser,
       updateUser,
        deleteUser,
         obtenerPuntuacion, 
     obtenerSolicitudesPendientes} from '../controllers/authController.js';

const router = Router();
// Primero definimos la ruta que no tiene parámetros de ID
router.get('/requests/:id', obtenerSolicitudesPendientes); // Obtener todas las invitaciones de amistad

// Luego definimos las rutas que aceptan parámetros de ID
router.get('/', getUsers); // Obtener todos los usuarios
router.get('/:id', getUserById); // Obtener un usuario por ID
router.post('/', createUser); // Crear un nuevo usuario
router.put('/:id', updateUser); // Actualizar un usuario
router.delete('/:id', deleteUser); // Eliminar un usuario
router.get('/:id/points', obtenerPuntuacion); // Obtener la puntuación de un usuario


export default router;