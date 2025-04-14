import { supabase } from './supabase';

// Interfaces para la información de usuario
export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  points?: number;
  created_at?: string;
}

// Obtener información de un usuario por su ID
export const getUserInfoById = async (userId: string): Promise<UserInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, points, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener información de usuario:', error);
    return null;
  }
};

// Buscar usuarios por nombre de usuario
export const searchUsersByUsername = async (query: string): Promise<UserInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, points')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    return [];
  }
};

// Actualizar información de un usuario
export const updateUserInfo = async (
  userId: string,
  updates: Partial<UserInfo>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al actualizar información de usuario:', error);
    return false;
  }
};

// Verificar si un usuario existe
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}; 