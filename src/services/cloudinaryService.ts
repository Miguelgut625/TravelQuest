import { Platform } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

// Configuración de Cloudinary
const CLOUDINARY_CLOUD_NAME = CLOUDINARY_CONFIG.CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_CONFIG.UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Verifica si la configuración de Cloudinary es válida
 * @returns {boolean} true si la configuración es válida
 */
export const isCloudinaryConfigured = () => {
  return !!CLOUDINARY_CONFIG.CLOUD_NAME && !!CLOUDINARY_CONFIG.UPLOAD_PRESET;
};

/**
 * Obtiene detalles sobre la configuración actual de Cloudinary
 * @returns Objeto con información sobre el estado de la configuración
 */
export const getCloudinaryConfigInfo = () => {
  const isConfigured = isCloudinaryConfigured();

  return {
    isConfigured,
    usingFallback: __DEV__ && !isConfigured,
    cloudName: CLOUDINARY_CONFIG.CLOUD_NAME,
    uploadPreset: CLOUDINARY_CONFIG.UPLOAD_PRESET
  };
};

/**
 * Comprueba si una URL es una imagen en formato base64
 */
const isBase64Image = (uri: string): boolean => {
  return uri.startsWith('data:image');
};

/**
 * Sube una imagen a Cloudinary (versión simplificada para ChatScreen)
 * @param imageUri URI de la imagen local
 * @returns URL de la imagen subida a Cloudinary
 */
export const uploadImage = async (imageUri: string): Promise<string> => {
  return await uploadImageToCloudinary(imageUri, `chat_${Date.now()}`);
};

/**
 * Sube una imagen a Cloudinary
 * @param uri URI de la imagen local
 * @param missionId ID de la misión asociada a la imagen
 * @returns URL de la imagen subida a Cloudinary
 */
export const uploadImageToCloudinary = async (imageUri: string, missionId: string): Promise<string> => {
  // Verificar si Cloudinary está configurado
  if (!isCloudinaryConfigured()) {
    if (__DEV__) {
      console.warn('Cloudinary no está configurado. En modo de desarrollo, retornando URI local.');
      return imageUri;
    }
    throw new Error('Cloudinary no está configurado correctamente');
  }

  try {
    // Convertir URI a base64 para plataformas web
    let formData = new FormData();

    // En web, el URI puede ser una cadena base64
    if (imageUri.startsWith('data:image')) {
      formData.append('file', imageUri);
    } else {
      // En dispositivos móviles, creamos un objeto de archivo
      const filename = imageUri.split('/').pop() || `mission_${missionId}_${Date.now()}`;

      // Crear un objeto de archivo para supabase
      const file = {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename
      };

      // @ts-ignore - TypeScript no reconoce correctamente el tipo para React Native
      formData.append('file', file);
    }

    // Añadir parámetros para Cloudinary
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);

    // Añadir carpeta si está configurada
    if (CLOUDINARY_CONFIG.FOLDER) {
      formData.append('folder', CLOUDINARY_CONFIG.FOLDER);
    }

    // Añadir transformaciones si están configuradas
    if (CLOUDINARY_CONFIG.TRANSFORMATION) {
      if (CLOUDINARY_CONFIG.TRANSFORMATION.WIDTH) {
        formData.append('width', CLOUDINARY_CONFIG.TRANSFORMATION.WIDTH.toString());
      }
      if (CLOUDINARY_CONFIG.TRANSFORMATION.HEIGHT) {
        formData.append('height', CLOUDINARY_CONFIG.TRANSFORMATION.HEIGHT.toString());
      }
      if (CLOUDINARY_CONFIG.TRANSFORMATION.QUALITY) {
        formData.append('quality', CLOUDINARY_CONFIG.TRANSFORMATION.QUALITY.toString());
      }
    }

    // Crear URL para la subida a Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/upload`;
    console.log('Intentando subir imagen a:', cloudinaryUrl);

    // Realizar la solicitud
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    // Verificar respuesta
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en la respuesta de Cloudinary (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('Imagen subida exitosamente a Cloudinary:', data.secure_url);

    return data.secure_url;
  } catch (error: any) {
    console.error('Error subiendo imagen a Cloudinary:', error);

    if (__DEV__) {
      console.warn('En modo desarrollo, retornando URI local como fallback.');
      return imageUri;
    }

    throw error;
  }
}; 