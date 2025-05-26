import axios from 'axios';
import { API_URL } from '../config/api';

export interface JournalEntryDB {
  id: string;
  userId: string;
  cityId: string;
  missionId?: string;
  title: string;
  content: string;
  photos: string[];
  location: {
    latitude: number;
    longitude: number;
  } | null;
  created_at: string;
  tags: string[];
  comments_visibility?: 'public' | 'friends' | 'private';
}

export interface CityJournalEntry extends JournalEntryDB {
  city_name: string;
}

export interface JournalComment {
  id: string;
  entry_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  username?: string;
}

/**
 * Verifica si existe la tabla journal_entries o journey_diary en la base de datos
 * @returns objeto con la información de qué tablas existen
 */
export const checkJournalTables = async (): Promise<{ journalEntriesExists: boolean, journeyDiaryExists: boolean }> => {
  try {
    const response = await axios.get(`${API_URL}/journal/check-tables`);
    return response.data;
  } catch (error) {
    console.error('Error verificando tablas del diario:', error);
    return {
      journalEntriesExists: false,
      journeyDiaryExists: false
    };
  }
};

/**
 * Obtiene todas las entradas del diario del usuario agrupadas por ciudad
 * @param userId ID del usuario 
 * @returns Entradas del diario agrupadas por ciudad
 */
export const getUserJournalEntries = async (userId: string): Promise<{ [cityName: string]: CityJournalEntry[] }> => {
  try {
    const response = await axios.get(`${API_URL}/journal/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo entradas del diario:', error);
    throw error;
  }
};

/**
 * Obtiene las entradas del diario relacionadas con una misión específica
 * @param userId ID del usuario
 * @param missionId ID de la misión
 * @returns Entradas del diario relacionadas con la misión
 */
export const getMissionJournalEntries = async (userId: string, missionId: string): Promise<CityJournalEntry[]> => {
  try {
    const response = await axios.get(`${API_URL}/journal/mission/${missionId}`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo entradas de la misión:', error);
    throw error;
  }
};

export const createJournalEntry = async (data: {
  userId: string;
  cityId: string;
  missionId: string;
  title: string;
  content: string;
  photos: string[];
  tags?: string[];
  comments_visibility?: 'public' | 'friends' | 'private';
}) => {
  try {
    console.log('📝 Creando entrada de diario con datos:', data);
    const response = await axios.post(`${API_URL}/journal/entry`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error en createJournalEntry:', error);
    throw error;
  }
};

// Obtener comentarios de una entrada
export async function getCommentsByEntryId(entryId: string): Promise<JournalComment[]> {
  try {
    const response = await axios.get(`${API_URL}/journal/entry/${entryId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    return [];
  }
}

// Insertar comentario en la tabla
export async function addCommentToEntryTable(entryId: string, userId: string, comment: string): Promise<boolean> {
  try {
    await axios.post(`${API_URL}/journal/entry/${entryId}/comments`, {
      userId,
      comment
    });
    return true;
  } catch (error) {
    console.error('Error al insertar comentario:', error);
    return false;
  }
}

export const getJournalEntryById = async (entryId: string, currentUserId?: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_URL}/journal/entry/${entryId}`, {
      params: { currentUserId }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener entrada del diario:', error);
    throw error;
  }
};

/**
 * Obtiene la configuración de visibilidad de comentarios de un usuario
 * @param userId ID del usuario
 * @returns La configuración de visibilidad de comentarios
 */
export const getUserCommentsVisibility = async (userId: string): Promise<'public' | 'friends' | 'private'> => {
  try {
    const response = await axios.get(`${API_URL}/journal/user/${userId}/comments-visibility`);
    return response.data.comments_visibility;
  } catch (error) {
    console.error('Error al obtener privacidad de comentarios:', error);
    return 'public';
  }
};

/**
 * Verifica si dos usuarios son amigos
 * @param userId1 ID del primer usuario
 * @param userId2 ID del segundo usuario
 * @returns true si son amigos, false en caso contrario
 */
export const checkFriendship = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/journal/friendship/${userId1}/${userId2}`);
    return response.data.areFriends;
  } catch (error) {
    console.error('Error al verificar amistad:', error);
    return false;
  }
}; 