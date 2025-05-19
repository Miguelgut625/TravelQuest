const { Router } = require('express');
const { getUsers,
     getUserById,
      createUser,
       updateUser,
        deleteUser,
         obtenerPuntuacion, 
     obtenerSolicitudesPendientes,
     login,
     resendVerification,
     forgotPassword,
     verifyCode,
     resetPassword} = require('../controllers/authController.js');

const router = Router();

// Luego definimos las rutas que aceptan parámetros de ID
router.get('/', getUsers); // Obtener todos los usuarios
router.get('/:id', getUserById); // Obtener un usuario por ID
router.post('/', createUser); // Crear un nuevo usuario
router.put('/:id', updateUser); // Actualizar un usuario
router.delete('/:id', deleteUser); // Eliminar un usuario
router.get('/:id/points', obtenerPuntuacion); // Obtener la puntuación de un usuario
router.post('/login', login); // Iniciar sesión
router.post('/resend-verification', resendVerification); // Reenviar correo de verificación
router.post('/forgot-password', forgotPassword); // Solicitar recuperación de contraseña
router.post('/verify-code', verifyCode); // Verificar código OTP
router.post('/reset-password', resetPassword); // Restablecer contraseña

module.exports = router;