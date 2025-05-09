import { Request, Response } from 'express';
import { supabase } from '../services/supabase.server';

// Obtener todas las insignias de un usuario
export const getUserBadges = async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (*)
      `)
      .eq('userId', userId);

    if (error) {
      console.error('Error al obtener insignias:', error);
      throw error;
    }

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Verificar y otorgar nuevas insignias
export const checkBadges = async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    // Primero obtenemos todas las insignias disponibles
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) throw badgesError;

    // Luego obtenemos las insignias que ya tiene el usuario
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('badgeId')
      .eq('userId', userId);

    if (userBadgesError) throw userBadgesError;

    // Creamos un conjunto con los IDs de las insignias que ya tiene el usuario
    const userBadgeIds = new Set(userBadges?.map(ub => ub.badgeId) || []);

    // Filtramos las insignias que el usuario no tiene
    const newBadges = allBadges?.filter(badge => !userBadgeIds.has(badge.id)) || [];

    // Otorgamos las nuevas insignias
    if (newBadges.length > 0) {
      const { error: insertError } = await supabase
        .from('user_badges')
        .insert(
          newBadges.map(badge => ({
            userId,
            badgeId: badge.id,
            unlocked_at: new Date().toISOString()
          }))
        );

      if (insertError) throw insertError;
    }

    res.status(200).json({ 
      message: 'Verificación completada',
      newBadges: newBadges.length
    });
  } catch (error) {
    console.error('Error al verificar insignias:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}; 