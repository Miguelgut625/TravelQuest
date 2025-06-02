import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';

export async function updateProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
        const cloudinaryUrl = await uploadImageToCloudinary(imageUri, `profile_${userId}`);

        const { error } = await supabase
            .from('users')
            .update({ profile_pic_url: cloudinaryUrl })
            .eq('id', userId);

        if (error) throw error;

        return cloudinaryUrl;
    } catch (error) {
        console.error('Error al actualizar foto de perfil:', error);
        throw error;
    }
}

export const getProfilePictureUrl = async (userId: string): Promise<string | null> => {
    try {
        const { data: userData, error } = await supabase
            .from('users')
            .select('profile_pic_url')
            .eq('id', userId)
            .single();

        if (error) throw error;

        return userData?.profile_pic_url || null;
    } catch (error) {
        console.error('Error al obtener la URL de la foto de perfil:', error);
        return null;
    }
};