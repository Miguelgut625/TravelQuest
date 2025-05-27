import axios from 'axios';
import { API_URL } from '../config/api';

const authService = {
  // Obtener todos los usuarios
  getUsers: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener un usuario por ID
  getUserById: async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Crear un nuevo usuario
  createUser: async (userData: { email: string; password: string; username: string }) => {
    try {
      const response = await axios.post(`${API_URL}/auth`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Actualizar un usuario
  updateUser: async (id: string, updates: any) => {
    try {
      const response = await axios.put(`${API_URL}/auth/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Eliminar un usuario
  deleteUser: async (id: string) => {
    try {
      const response = await axios.delete(`${API_URL}/auth/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener puntuación
  getPoints: async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/${id}/points`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Login
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Reenviar verificación
  resendVerification: async (email: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Olvidar contraseña
  forgotPassword: async (email: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verificar código
  verifyCode: async (data: { email: string; token: string }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-code`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Restablecer contraseña
  resetPassword: async (newPassword: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, { newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default authService; 