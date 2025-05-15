import { supabase } from './supabase';

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    profile_pic_url?: string;
    created_at?: string;
    profile_visibility?: 'public' | 'friends' | 'private';
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

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
        const { data, error } = await supabase
            .from('users')
            .select('id, username, points, profile_visibility')
            .ilike('username', `%${username}%`)
            .limit(10);

        if (error) throw error;

        // Si no hay usuario actual, solo mostramos perfiles públicos
        if (!currentUserId) {
            const publicUsers = data.filter(user => user.profile_visibility === 'public');
            return await Promise.all(
                publicUsers.map(async (user) => {
                    const { data: rankData, error: rankError } = await supabase
                        .from('leaderboard')
                        .select('rank')
                        .eq('userId', user.id)
                        .single();

                    return {
                        id: user.id,
                        username: user.username,
                        points: user.points,
                        rankIndex: rankError ? undefined : rankData.rank
                    };
                })
            );
        }

        // Si hay usuario actual, verificamos las relaciones de amistad
        const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select('user2Id')
            .eq('user1Id', currentUserId);

        if (friendsError) throw friendsError;

        const friendIds = new Set(friendsData.map(f => f.user2Id));

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
                const { data: rankData, error: rankError } = await supabase
                    .from('leaderboard')
                    .select('rank')
                    .eq('userId', user.id)
                    .single();

                return {
                    id: user.id,
                    username: user.username,
                    points: user.points,
                    rankIndex: rankError ? undefined : rankData.rank
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
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al actualizar perfil de usuario:', error);
        return false;
    }
}

export async function getUserInfoById(userId: string): Promise<{ username: string } | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        return null;
    }
} 