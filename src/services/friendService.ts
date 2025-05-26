import axios from 'axios';
import { API_URL } from '../config/api';
import NotificationService from './NotificationService';

// Función para obtener todos los amigos de un usuario
export const getFriends = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/friends/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

// Función para obtener todas las solicitudes de amistad pendientes
export const getFriendRequests = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/friends/requests/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
};

// Función para enviar una solicitud de amistad
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    const response = await axios.post(`${API_URL}/friends/send-request`, {
      senderId,
      receiverId
    });
    return response.data;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error: error.response?.data?.error || 'Error al enviar la solicitud' };
  }
};

// Función para aceptar una solicitud de amistad
export const acceptFriendRequest = async (requestId: string) => {
  try {
    const response = await axios.put(`${API_URL}/friends/accept-request/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, error: error.response?.data?.error || 'Error al aceptar la solicitud' };
  }
};

// Función para rechazar una solicitud de amistad
export const rejectFriendRequest = async (requestId: string) => {
  try {
    const response = await axios.put(`${API_URL}/friends/reject-request/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, error: error.response?.data?.error || 'Error al rechazar la solicitud' };
  }
};

// Función para eliminar una relación de amistad
export const deleteFriendship = async (userId1: string, userId2: string) => {
  try {
    const response = await axios.delete(`${API_URL}/friends/${userId1}/${userId2}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar la amistad:', error);
    return { success: false, error: error.response?.data?.error || 'Error al eliminar la amistad' };
  }
};

// Función para cancelar una solicitud de amistad
export const cancelFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/friends/cancel-request/${senderId}/${receiverId}`);
    return response.data;
  } catch (error) {
    console.error('Error al cancelar la solicitud:', error);
    return { success: false, error: error.response?.data?.error || 'Error al cancelar la solicitud' };
  }
};

// Función para obtener amigos en común entre dos usuarios
export const getMutualFriends = async (userId1: string, userId2: string) => {
  try {
    const response = await axios.get(`${API_URL}/friends/mutual/${userId1}/${userId2}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener amigos en común:', error);
    return [];
  }
}; 