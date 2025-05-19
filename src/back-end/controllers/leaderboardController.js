const { supabase } = require('../../services/supabase.server.js');

const getLeaderboard = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, points')
      .order('points', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error al obtener el leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el leaderboard'
    });
  }
};

module.exports = {
  getLeaderboard
}; 