import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';
import axios from 'axios';
import { API_URL } from '../config/api';

export async function updateProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
        const cloudinaryUrl = await uploadImageToCloudinary(imageUri, `profile_${userId}`);

        const { error } = await supabase
            .from('users')
            .update({ profile_pic_url: cloudinaryUrl })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        return cloudinaryUrl;
    } catch (error: any) {
        console.error('Error al actualizar foto de perfil:', error);
        throw error.message || 'Error al actualizar foto de perfil';
    }
}

export const getProfilePictureUrl = async (userId: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('profile_pic_url')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error al obtener la URL de la foto de perfil:', error);
            return null;
        }

        return data?.profile_pic_url || null;
    } catch (error: any) {
        console.error('Error al obtener la URL de la foto de perfil:', error);
        return null;
    }
};

const profileService = {
  // Estadísticas - mantener axios si tienes un backend específico para estadísticas
  getUserStats: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/stats`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  getAdvancedStats: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/advanced-stats`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Privacidad - usar Supabase directamente
  getPrivacySettings: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_visibility, friends_visibility, comments_visibility')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      throw error.message || 'Error al obtener configuración de privacidad';
    }
  },

  updatePrivacySettings: async (userId: string, type: string, visibility: 'public' | 'friends' | 'private') => {
    try {
      const updateData: any = {};
      
      switch (type) {
        case 'profile':
          updateData.profile_visibility = visibility;
          break;
        case 'friends':
          updateData.friends_visibility = visibility;
          break;
        case 'comments':
          updateData.comments_visibility = visibility;
          break;
        default:
          throw new Error('Tipo de privacidad no válido');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      throw error.message || 'Error al actualizar configuración de privacidad';
    }
  },

  // Insignias - mantener axios si tienes un backend específico para insignias
  getUserBadges: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/badges`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Título personalizado - usar Supabase directamente
  getCustomTitle: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('custom_title')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return { custom_title: data?.custom_title || null };
    } catch (error: any) {
      throw error.message || 'Error al obtener título personalizado';
    }
  },

  updateCustomTitle: async (userId: string, title: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ custom_title: title })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      throw error.message || 'Error al actualizar título personalizado';
    }
  }
};

export default profileService;