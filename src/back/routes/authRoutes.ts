import { Router } from 'express';
import { 
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    obtenerPuntuacion,
    obtenerSolicitudesPendientes,
    login,
    resendVerificationEmail,
    forgotPassword,
    verifyCode,
    resetPassword
} from '../controllers/authController';

const router = Router();

// Rutas de autenticación y gestión de usuarios
router.get('/', getUsers); // Obtener todos los usuarios
router.get('/:id', getUserById); // Obtener un usuario por ID
router.post('/', createUser); // Crear un nuevo usuario
router.put('/:id', updateUser); // Actualizar un usuario
router.delete('/:id', deleteUser); // Eliminar un usuario
router.get('/:id/points', obtenerPuntuacion); // Obtener la puntuación de un usuario
router.get('/:id/pending-requests', obtenerSolicitudesPendientes); // Obtener solicitudes pendientes

// Nuevas rutas para autenticación
router.post('/login', login); // Iniciar sesión
router.post('/resend-verification', resendVerificationEmail); // Reenviar correo de verificación
router.post('/forgot-password', forgotPassword); // Solicitar recuperación de contraseña
router.post('/verify-code', verifyCode); // Verificar código OTP
router.post('/reset-password', resetPassword); // Restablecer contraseña

export default router;