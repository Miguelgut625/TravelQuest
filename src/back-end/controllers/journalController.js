const { supabase } = require('../../services/supabase.server');

// Obtener todas las entradas del diario del usuario agrupadas por ciudad
const getUserJournalEntries = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar qué tablas existen
    const { journalEntriesExists, journeyDiaryExists } = await checkJournalTables();

    if (!journalEntriesExists && !journeyDiaryExists) {
      return res.status(404).json({ error: 'No se encontraron tablas para el diario' });
    }

    let entriesData = null;
    let error = null;

    // Primero intentamos con journal_entries si existe
    if (journalEntriesExists) {
      try {
        const { data, error: entriesError } = await supabase
          .from('journal_entries')
          .select(`
            *,
            cities:cityid (
              name
            )
          `)
          .eq('userid', userId)
          .order('created_at', { ascending: false });

        if (!entriesError) {
          entriesData = data;
        } else {
          // Si hay error de relación, intentamos sin la relación
          const { data: basicData, error: basicError } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('userid', userId)
            .order('created_at', { ascending: false });

          if (!basicError) {
            entriesData = basicData;
          } else {
            error = basicError;
          }
        }
      } catch (e) {
        console.error('Error al obtener datos de journal_entries:', e);
      }
    }

    // Si no obtuvimos datos de journal_entries, intentamos con journey_diary
    if (!entriesData && journeyDiaryExists) {
      try {
        const { data, error: diaryError } = await supabase
          .from('journey_diary')
          .select('*')
          .eq('userid', userId)
          .order('created_at', { ascending: false });

        if (!diaryError) {
          entriesData = data;
        } else {
          error = diaryError;
        }
      } catch (e) {
        console.error('Error al obtener datos de journey_diary:', e);
      }
    }

    if (error) {
      throw error;
    }

    // Organizar las entradas por ciudad
    const entriesByCity = organizeCityEntries(entriesData);
    res.json(entriesByCity);

  } catch (error) {
    console.error('Error obteniendo entradas del diario:', error);
    res.status(500).json({ error: 'Error al obtener las entradas del diario' });
  }
};

// Obtener una entrada específica del diario
const getJournalEntryById = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { currentUserId } = req.query;

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        cities:cityid (
          name
        )
      `)
      .eq('id', entryId)
      .single();

    if (error) throw error;
    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Si hay un usuario actual, verificar si es amigo del autor
    if (currentUserId && entry.userid !== currentUserId) {
      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user1Id.eq.${currentUserId},user2Id.eq.${entry.userid}),and(user1Id.eq.${entry.userid},user2Id.eq.${currentUserId})`)
        .single();

      entry.is_friend = !!friendship;
    }

    res.json(entry);
  } catch (error) {
    console.error('Error al obtener entrada del diario:', error);
    res.status(500).json({ error: 'Error al obtener la entrada del diario' });
  }
};

// Crear una nueva entrada en el diario
const createJournalEntry = async (req, res) => {
  try {
    const { userId, cityId, missionId, title, content, photos, tags, comments_visibility } = req.body;

    if (!userId || !missionId) {
      return res.status(400).json({ error: 'userId y missionId son requeridos' });
    }

    const baseData = {
      userid: userId,
      missionid: missionId,
      cityid: cityId === 'unknown' ? null : cityId,
      title,
      content: content || '',
      photos: Array.isArray(photos) ? photos : [photos],
      tags: Array.isArray(tags) ? tags : [],
      created_at: new Date().toISOString(),
      comments_visibility: comments_visibility || 'public'
    };

    const { data: newEntry, error: insertError } = await supabase
      .from('journal_entries')
      .insert(baseData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Crear entrada en la tabla journal
    await supabase
      .from('journal')
      .insert({
        userId,
        missionId,
        content: '¡He completado una misión de evento!',
        is_event: true
      });

    res.json(newEntry);
  } catch (error) {
    console.error('Error en createJournalEntry:', error);
    res.status(500).json({ error: 'Error al crear la entrada del diario' });
  }
};

// Obtener comentarios de una entrada
const getCommentsByEntryId = async (req, res) => {
  try {
    const { entryId } = req.params;

    const { data, error } = await supabase
      .from('journal_comments')
      .select('*, users: user_id (username)')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = data.map(c => ({
      ...c,
      username: c.users?.username || 'Usuario',
    }));

    res.json(comments);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener los comentarios' });
  }
};

// Añadir un comentario a una entrada
const addCommentToEntry = async (req, res) => {
  try {
    const { entryId, userId, comment } = req.body;

    const { error } = await supabase
      .from('journal_comments')
      .insert({ entry_id: entryId, user_id: userId, comment });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error al insertar comentario:', error);
    res.status(500).json({ error: 'Error al añadir el comentario' });
  }
};

// Actualizar una entrada con descripción de IA
const updateJournalWithAIDescription = async (req, res) => {
  try {
    const { missionId, userId, description } = req.body;

    const { error } = await supabase
      .from('journal_entries')
      .update({ content: description })
      .eq('missionid', missionId)
      .eq('userid', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar descripción:', error);
    res.status(500).json({ error: 'Error al actualizar la descripción' });
  }
};

// Obtener la configuración de visibilidad de comentarios de un usuario
const getUserCommentsVisibility = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('comments_visibility')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({ comments_visibility: data?.comments_visibility || 'public' });
  } catch (error) {
    console.error('Error al obtener privacidad de comentarios:', error);
    res.status(500).json({ error: 'Error al obtener la configuración de privacidad' });
  }
};

// Verificar si dos usuarios son amigos
const checkFriendship = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    // Verificar si userId1 es user1Id
    const { data: user1Data, error: user1Error } = await supabase
      .from('friends')
      .select('id')
      .eq('user1Id', userId1)
      .eq('user2Id', userId2)
      .single();

    if (user1Error && user1Error.code !== 'PGRST116') {
      throw user1Error;
    }

    // Verificar si userId1 es user2Id
    const { data: user2Data, error: user2Error } = await supabase
      .from('friends')
      .select('id')
      .eq('user1Id', userId2)
      .eq('user2Id', userId1)
      .single();

    if (user2Error && user2Error.code !== 'PGRST116') {
      throw user2Error;
    }

    // Si cualquiera de las dos consultas devuelve datos, son amigos
    const areFriends = !!(user1Data || user2Data);

    res.json({ areFriends });
  } catch (error) {
    console.error('Error al verificar amistad:', error);
    res.status(500).json({ error: 'Error al verificar la amistad' });
  }
};

// Funciones auxiliares
const checkJournalTables = async () => {
  try {
    const [journalEntriesResult, journeyDiaryResult] = await Promise.allSettled([
      supabase.from('journal_entries').select('id').limit(1),
      supabase.from('journey_diary').select('id').limit(1)
    ]);

    return {
      journalEntriesExists: journalEntriesResult.status === 'fulfilled' && !journalEntriesResult.value.error,
      journeyDiaryExists: journeyDiaryResult.status === 'fulfilled' && !journeyDiaryResult.value.error
    };
  } catch (error) {
    console.error('Error verificando tablas del diario:', error);
    return {
      journalEntriesExists: false,
      journeyDiaryExists: false
    };
  }
};

const organizeCityEntries = (data) => {
  const entriesByCity = {};

  if (!data || data.length === 0) {
    return entriesByCity;
  }

  data.forEach((entry) => {
    let cityName = 'Ciudad Desconocida';

    if (entry.cities?.name) {
      cityName = entry.cities.name;
    } else if (entry.city_name) {
      cityName = entry.city_name;
    } else if (entry.correctedCityName) {
      cityName = entry.correctedCityName;
    } else if (entry.cityName) {
      cityName = entry.cityName;
    } else if (entry.cityname) {
      cityName = entry.cityname;
    } else if (entry.cities && entry.cities.name) {
      cityName = entry.cities.name;
    } else if (entry.city?.name) {
      cityName = entry.city.name;
    } else if (entry.tags && Array.isArray(entry.tags)) {
      const commonTags = ['misión', 'mission', 'viaje', 'travel', 'foto', 'photo'];
      const possibleCityTag = entry.tags.find((tag) =>
        !commonTags.includes(tag.toLowerCase()) &&
        tag.charAt(0).toUpperCase() === tag.charAt(0)
      );

      if (possibleCityTag) {
        cityName = possibleCityTag;
      }
    }

    if (!entriesByCity[cityName]) {
      entriesByCity[cityName] = [];
    }

    const processedEntry = {
      id: entry.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: entry.userId || entry.user_id || entry.userid || '',
      cityId: entry.cityId || entry.city_id || entry.cityid || '',
      missionId: entry.missionId || entry.mission_id || entry.missionid || undefined,
      title: entry.title || 'Entrada sin título',
      content: entry.content || '',
      photos: Array.isArray(entry.photos) ? entry.photos :
        (entry.photos ? [entry.photos] : []),
      location: entry.location || null,
      created_at: entry.created_at || new Date().toISOString(),
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      city_name: cityName
    };

    entriesByCity[cityName].push(processedEntry);
  });

  return entriesByCity;
};

module.exports = {
  getUserJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  getCommentsByEntryId,
  addCommentToEntry,
  updateJournalWithAIDescription,
  getUserCommentsVisibility,
  checkFriendship
}; 