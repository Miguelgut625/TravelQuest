/**
 * Configuración de Cloudinary para TravelQuest
 * 
 * Pasos para configurar:
 * 1. Regístrate en Cloudinary: https://cloudinary.com/users/register/free
 * 2. Desde el Dashboard de Cloudinary, obtén tu "Cloud Name"
 * 3. Ve a Settings -> Upload -> Upload Presets -> Add upload preset:
 *    - Configúralo como "Unsigned"
 *    - Opcional: En "Folder", escribe "travelquest" o el nombre que prefieras
 *    - Guarda y anota el nombre del preset
 * 4. Completa los valores en este archivo con tus datos
 * 
 * Más información: https://cloudinary.com/documentation
 */

export const CLOUDINARY_CONFIG = {
  /**
   * El nombre único de tu cuenta de Cloudinary
   * Lo encontrarás en el Dashboard
   */
  CLOUD_NAME: 'dwrdlqzso',  // Reemplaza con tu Cloud Name real

  /**
   * El nombre del Upload Preset que creaste
   * Debe estar configurado como "Unsigned"
   */
  UPLOAD_PRESET: 'travelquest',  // Reemplaza con tu Upload Preset real

  /**
   * Tu API Key de Cloudinary (opcional)
   * Solo necesario si usas uploads firmados
   */
  API_KEY: '214482343466549',

  /**
   * Tu API Secret de Cloudinary (opcional)
   * NUNCA incluyas esto en código que se ejecute en el cliente
   * Solo para uso en backend
   */
  API_SECRET: 'dKrM4tM5WsfElA5lBmwm6OYDQpk',

  /**
   * Carpeta donde se guardarán las imágenes
   * Opcional, pero ayuda a mantener organizados tus archivos
   */
  FOLDER: 'missions',

  /**
   * Opciones de transformación para las imágenes
   * Opcional, pero útil para reducir tamaño y mejorar rendimiento
   */
  TRANSFORMATION: {
    WIDTH: 1200,      // Ancho máximo en píxeles
    HEIGHT: 1200,     // Alto máximo en píxeles
    QUALITY: 'auto',  // Calidad: 'auto', '60', '80', etc.
  }
}; 