import { supabase } from './supabase';
import { addPointsToUser, deductPointsFromUser } from './pointsService';
import { generateMissionHint } from './aiService';

// Precio en puntos para obtener una pista
export const HINT_COST = 15;

// Interfaz para la pista
export interface MissionHint {
  hint: string;
  missionId: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  completed: boolean;
  cityName: string;
  end_date: string;
}

/**
 * Obtiene una pista para una misión específica
 * @param userId ID del usuario que solicita la pista
 * @param missionId ID de la misión para la cual se solicita la pista
 * @returns Objeto con la pista
 */
export const getMissionHint = async (userId: string, missionId: string): Promise<MissionHint> => {
  try {
    // Verificar si hay puntos suficientes
    await deductPointsFromUser(userId, HINT_COST);

    // Obtener información de la misión para generar una pista contextualizada
    const { data: missionData, error: missionError } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        journeyId,
        challengeId,
        journeys (
          id, 
          cities (
            name
          )
        ),
        challenges (
          id,
          title,
          description,
          difficulty
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !missionData) {
      throw missionError || new Error('No se encontró la misión');
    }

    const missionTitle = missionData.challenges.title;
    const missionDescription = missionData.challenges.description;
    // Obtener el nombre de la ciudad a través de la relación con journeys
    const cityName = missionData.journeys?.cities?.name || 'Ciudad desconocida';
    
    // Generar pista utilizando AI
    const hint = await generateMissionHint(
      missionDescription,
      missionTitle,
      cityName
    );

    // Registrar el uso de la pista
    await supabase
      .from('mission_hints')
      .insert([
        {
          userId,
          missionId,
          hint,
          created_at: new Date().toISOString()
        }
      ]);

    return {
      hint,
      missionId
    };
  } catch (error) {
    console.error('Error al obtener pista para la misión:', error);
    throw error;
  }
};

export const getMissionsByCityAndDuration = async (city: string, duration: number) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('city', city)
      .lte('duration', duration);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching missions:', error);
    throw error;
  }
};

export const getUserMissions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        completed,
        end_date,
        challenges (
          title,
          description,
          difficulty,
          points
        ),
        journeys!inner (
          userId,
          cities!inner (
            name
          )
        )
      `)
      .eq('journeys.userId', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo misiones del usuario:', error);
    return [];
  }
};

// Función para compartir una misión con un amigo dentro de la app
export const shareMissionWithFriend = async (
  missionId: string,
  sharedByUserId: string,
  sharedWithUserId: string,
  missionTitle: string,
  cityName: string
) => {
  try {
    console.log('🚀 Compartiendo misión con amigo:', {
      missionId,
      sharedByUserId,
      sharedWithUserId,
      missionTitle
    });

    // Verificar si ya se compartió esta misión con este amigo
    const { data: existingShare } = await supabase
      .from('missions_shared')
      .select('id')
      .eq('mission_id', missionId)
      .eq('shared_by_user_id', sharedByUserId)
      .eq('shared_with_user_id', sharedWithUserId)
      .single();

    if (existingShare) {
      throw new Error('Ya compartiste esta misión con este amigo');
    }

    // Crear el registro de misión compartida
    const { data, error } = await supabase
      .from('missions_shared')
      .insert({
        mission_id: missionId,
        shared_by_user_id: sharedByUserId,
        shared_with_user_id: sharedWithUserId,
        shared_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Obtener el username del usuario que comparte
    const { data: sharedByUser } = await supabase
      .from('users')
      .select('username')
      .eq('id', sharedByUserId)
      .single();

    // Crear notificación para el amigo
    const notificationTitle = '🎯 Nueva misión compartida';
    const notificationMessage = `${sharedByUser?.username || 'Un amigo'} compartió contigo la misión "${missionTitle}" en ${cityName}`;

    await supabase
      .from('notifications')
      .insert({
        userid: sharedWithUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'mission_shared',
        read: false,
        data: {
          missionId,
          sharedByUserId,
          missionTitle,
          cityName
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log('✅ Misión compartida exitosamente');
    return { success: true, data };

  } catch (error) {
    console.error('Error al compartir misión:', error);
    throw error;
  }
};

// Función para obtener misiones compartidas contigo
export const getSharedMissions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('missions_shared')
      .select(`
        id,
        mission_id,
        shared_at,
        shared_by_user:users!missions_shared_shared_by_user_id_fkey (
          id,
          username
        ),
        journeys_missions!inner (
          id,
          completed,
          end_date,
          challenges (
            title,
            description,
            difficulty,
            points
          ),
          journeys (
            cities (
              name
            )
          )
        )
      `)
      .eq('shared_with_user_id', userId)
      .order('shared_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo misiones compartidas:', error);
    return [];
  }
};

// Función para eliminar una misión compartida
export const removeMissionShare = async (shareId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('missions_shared')
      .delete()
      .eq('id', shareId)
      .eq('shared_with_user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar misión compartida:', error);
    throw error;
  }
};
