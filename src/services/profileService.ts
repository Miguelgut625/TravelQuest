import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';
import axios from 'axios';
import { API_URL } from '../config/api';

export async function updateProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
        const cloudinaryUrl = await uploadImageToCloudinary(imageUri, `profile_${userId}`);

        const response = await axios.put(`${API_URL}/profile/${userId}/picture`, {
            profile_pic_url: cloudinaryUrl
        });

        return cloudinaryUrl;
    } catch (error: any) {
        console.error('Error al actualizar foto de perfil:', error);
        throw error.response?.data || error.message;
    }
}

export const getProfilePictureUrl = async (userId: string): Promise<string | null> => {
    try {
        const response = await axios.get(`${API_URL}/profile/${userId}/picture`);
        return response.data.profile_pic_url || null;
    } catch (error: any) {
        console.error('Error al obtener la URL de la foto de perfil:', error);
        return null;
    }
};

const profileService = {
  // Estadísticas
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

  // Privacidad
  getPrivacySettings: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/privacy`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  updatePrivacySettings: async (userId: string, type: string, visibility: 'public' | 'friends' | 'private') => {
    try {
      const response = await axios.put(`${API_URL}/profile/${userId}/privacy`, {
        type,
        visibility
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Insignias
  getUserBadges: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/badges`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Título personalizado
  getCustomTitle: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/${userId}/title`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  updateCustomTitle: async (userId: string, title: string) => {
    try {
      const response = await axios.put(`${API_URL}/profile/${userId}/title`, {
        title
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  }
};

export default profileService;