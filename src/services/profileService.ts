import { supabase } from './supabase';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

export async function updateProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileName = `profile_${userId}_${Date.now()}.jpg`;

        const { data, error } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);

        return publicUrl;
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