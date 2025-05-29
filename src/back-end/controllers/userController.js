const { supabase } = require('../../services/supabase.server.js');

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { userId, email } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email,
        points: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ points: user.points });
  } catch (error) {
    console.error('Error obteniendo puntos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ points })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ points: user.points });
  } catch (error) {
    console.error('Error actualizando puntos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { username, currentUserId } = req.query;

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, points, profile_visibility')
      .ilike('username', `%${username}%`)
      .limit(10);

    if (error) throw error;

    // Si hay usuario actual, verificamos las relaciones de amistad
    let friendIds = new Set();
    if (currentUserId) {
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('user2Id')
        .eq('user1Id', currentUserId);

      if (friendsError) throw friendsError;

      friendIds = new Set(friendsData.map(f => f.user2Id));
    }

    // Filtramos los usuarios según su configuración de privacidad
    const filteredUsers = users.filter(user => {
      if (user.id === currentUserId) return true;
      if (user.profile_visibility === 'public') return true;
      if (user.profile_visibility === 'friends' && friendIds.has(user.id)) return true;
      return false;
    });

    // Obtenemos el ranking de cada usuario
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

    res.json(usersWithRank);
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 