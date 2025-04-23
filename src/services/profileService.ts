import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';

/**
 * Actualiza la foto de perfil del usuario
 * @param userId ID del usuario
 * @param imageUri URI de la imagen local
 * @returns URL de la imagen en Cloudinary
 */
export const updateProfilePicture = async (userId: string, imageUri: string): Promise<string> => {
  try {
    if (!userId) {
      throw new Error('ID de usuario no proporcionado');
    }

    // Subir la imagen a Cloudinary
    console.log('Subiendo imagen a Cloudinary...');
    const cloudinaryUrl = await uploadImageToCloudinary(imageUri, `profile_${userId}`);
    
    // Actualizar el campo en la base de datos
    console.log('Actualizando registro de usuario con la nueva URL de imagen...');
    const { data, error } = await supabase
      .from('users')
      .update({ profile_pic_url: cloudinaryUrl })
      .eq('id', userId);
    
    if (error) {
      console.error('Error al actualizar foto de perfil:', error);
      throw error;
    }
    
    console.log('Foto de perfil actualizada con éxito:', cloudinaryUrl);
    return cloudinaryUrl;
  } catch (error: any) {
    console.error('Error en updateProfilePicture:', error);
    throw new Error(`Error al actualizar la foto de perfil: ${error.message}`);
  }
};

/**
 * Obtiene la URL de la foto de perfil del usuario
 * @param userId ID del usuario
 * @returns URL de la foto de perfil
 */
export const getProfilePictureUrl = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('profile_pic_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error al obtener la foto de perfil:', error);
      return null;
    }
    
    return data?.profile_pic_url || null;
  } catch (error) {
    console.error('Error en getProfilePictureUrl:', error);
    return null;
  }
}; 