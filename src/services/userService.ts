import axios from 'axios';
import { API_URL } from '../config/api';

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    profile_pic_url?: string;
    created_at?: string;
    profile_visibility?: 'public' | 'friends' | 'private';
}

export const getUserById = async (userId: string) => {
    try {
        const response = await axios.get(`${API_URL}/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

export const createUser = async (userId: string, email: string) => {
    try {
        const response = await axios.post(`${API_URL}/users`, {
            userId,
            email
        });
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

export const updateUser = async (userId: string, userData: any) => {
    try {
        const response = await axios.put(`${API_URL}/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

export const deleteUser = async (userId: string) => {
    try {
        const response = await axios.delete(`${API_URL}/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

export const getUserPoints = async (userId: string) => {
    try {
        const response = await axios.get(`${API_URL}/users/${userId}/points`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user points:', error);
        throw error;
    }
};

export const updateUserPoints = async (userId: string, points: number) => {
    try {
        const response = await axios.put(`${API_URL}/users/${userId}/points`, { points });
        return response.data;
    } catch (error) {
        console.error('Error updating user points:', error);
        throw error;
    }
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data, error } = await axios.get(`${API_URL}/users/${userId}`);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al obtener perfil de usuario:', error);
        return null;
    }
}

export const searchUsersByUsername = async (username: string, currentUserId?: string) => {
    try {
        // Primero obtenemos los usuarios que coinciden con la búsqueda
        const { data, error } = await axios.get(`${API_URL}/users`, {
            params: {
                username: username,
                limit: 10
            }
        });

        if (error) throw error;

        // Si no hay usuario actual, solo mostramos perfiles públicos
        if (!currentUserId) {
            const publicUsers = data.filter(user => user.profile_visibility === 'public');
            return await Promise.all(
                publicUsers.map(async (user) => {
                    const { data: rankData, error: rankError } = await axios.get(`${API_URL}/leaderboard`, {
                        params: {
                            userId: user.id
                        }
                    });

                    return {
                        id: user.id,
                        username: user.username,
                        points: user.points,
                        rankIndex: rankError ? undefined : rankData.data.rank
                    };
                })
            );
        }

        // Si hay usuario actual, verificamos las relaciones de amistad
        const { data: friendsData, error: friendsError } = await axios.get(`${API_URL}/friends`, {
            params: {
                user1Id: currentUserId
            }
        });

        if (friendsError) throw friendsError;

        const friendIds = new Set(friendsData.data.map(f => f.user2Id));

        // Filtramos los usuarios según su configuración de privacidad
        const filteredUsers = data.filter(user => {
            if (user.id === currentUserId) return false; // No mostrar al usuario actual
            if (user.profile_visibility === 'public') return true;
            if (user.profile_visibility === 'friends' && friendIds.has(user.id)) return true;
            return false; // No mostrar perfiles privados o perfiles de amigos cuando la configuración es 'friends'
        });

        // Obtenemos los rangos de los usuarios filtrados
        const usersWithRank = await Promise.all(
            filteredUsers.map(async (user) => {
                const { data: rankData, error: rankError } = await axios.get(`${API_URL}/leaderboard`, {
                    params: {
                        userId: user.id
                    }
                });

                return {
                    id: user.id,
                    username: user.username,
                    points: user.points,
                    rankIndex: rankError ? undefined : rankData.data.rank
                };
            })
        );

        return usersWithRank;
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
};

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
        const { data, error } = await axios.put(`${API_URL}/users/${userId}`, updates);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al actualizar perfil de usuario:', error);
        return false;
    }
}

export async function getUserInfoById(userId: string): Promise<{ username: string } | null> {
    try {
        const { data, error } = await axios.get(`${API_URL}/users/${userId}`);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        return null;
    }
} 