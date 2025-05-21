import { supabase } from './supabase';

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
    // Probamos si las tablas existen obteniendo solo una fila de cada una
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

/**
 * Obtiene todas las entradas del diario del usuario agrupadas por ciudad
 * @param userId ID del usuario 
 * @returns Entradas del diario agrupadas por ciudad
 */
export const getUserJournalEntries = async (userId: string): Promise<{ [cityName: string]: CityJournalEntry[] }> => {
  try {
    // Verificar qué tablas existen
    const { journalEntriesExists, journeyDiaryExists } = await checkJournalTables();

    if (!journalEntriesExists && !journeyDiaryExists) {
      console.warn('No se encontraron tablas para el diario (journal_entries o journey_diary)');
      return {}; // Devolvemos un objeto vacío
    }

    let entriesData = null;
    let error = null;

    // Primero intentamos con journal_entries si existe
    if (journalEntriesExists) {
      try {
        // Intentamos con la relación a cities
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
        } else if (entriesError.message && (
          entriesError.message.includes('cityid') ||
          entriesError.message.includes('cityId') ||
          entriesError.message.includes('relationship') ||
          entriesError.code === 'PGRST200' ||
          entriesError.code === '42703')) {

          // Si hay error de relación, intentamos sin la relación y con nombres alternativos
          try {
            const { data: basicData, error: basicError } = await supabase
              .from('journal_entries')
              .select('*')
              .eq('userid', userId)
              .order('created_at', { ascending: false });

            if (!basicError) {
              entriesData = basicData;
            } else {
              // Intentar con user_id (otra convención común en PostgreSQL)
              const { data: altData, error: altError } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

              if (!altError) {
                entriesData = altData;
              } else {
                error = altError;
              }
            }
          } catch (e) {
            console.warn('Error al obtener datos sin relación:', e);
          }
        } else {
          error = entriesError;
        }
      } catch (e) {
        console.warn('Error al obtener datos de journal_entries:', e);
      }
    }

    // Si no obtuvimos datos de journal_entries o hubo un error, intentamos con journey_diary
    if (!entriesData && journeyDiaryExists) {
      try {
        // Intentamos diferentes convenciones de nombres para las columnas
        const possibleQueries = [
          // Versión 1: Lowercase
          supabase.from('journey_diary').select('*').eq('userid', userId).order('created_at', { ascending: false }),
          // Versión 2: Underscore
          supabase.from('journey_diary').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        ];

        for (const query of possibleQueries) {
          try {
            const { data: diaryData, error: diaryError } = await query;
            if (!diaryError && diaryData && diaryData.length > 0) {
              entriesData = diaryData;
              break;
            }
          } catch (e) {
            // Continuar con la siguiente consulta
            console.warn('Error en consulta alternativa:', e);
          }
        }
      } catch (e) {
        console.warn('Error al obtener datos de journey_diary:', e);
      }
    }

    // Si después de intentar con ambas tablas seguimos sin datos y tenemos un error, lo lanzamos
    if (!entriesData && error) {
      throw error;
    }

    // Si no hay datos (pero no hubo error), devolvemos un objeto vacío
    if (!entriesData) {
      return {};
    }

    // Organizar las entradas por ciudad
    return organizeCityEntries(entriesData, true);
  } catch (error) {
    console.error('Error obteniendo entradas del diario:', error);
    throw error;
  }
};

/**
 * Organiza las entradas del diario por ciudad
 * @param data Datos de las entradas
 * @param missingCityRelation Indica si falta la relación con la ciudad
 * @returns Entradas organizadas por ciudad
 */
const organizeCityEntries = (
  data: any[] | null,
  missingCityRelation: boolean = false
): { [cityName: string]: CityJournalEntry[] } => {
  const entriesByCity: { [cityName: string]: CityJournalEntry[] } = {};

  if (!data || data.length === 0) {
    return entriesByCity;
  }

  data.forEach((entry: any) => {
    // Intentar todas las posibles formas del nombre de la ciudad
    // Nota: Se usa el nombre de ciudad corregido siempre que esté disponible
    let cityName = 'Ciudad Desconocida';

    // Orden de prioridad para obtener el nombre de la ciudad
    if (!missingCityRelation && entry.cities?.name) {
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
    } else {
      // Buscar en las etiquetas cualquier nombre que parezca ser de ciudad
      if (entry.tags && Array.isArray(entry.tags)) {
        // Filtrar tags comunes que no son ciudades
        const commonTags = ['misión', 'mission', 'viaje', 'travel', 'foto', 'photo'];
        const possibleCityTag = entry.tags.find((tag: string) =>
          !commonTags.includes(tag.toLowerCase()) &&
          tag.charAt(0).toUpperCase() === tag.charAt(0) // Primera letra mayúscula
        );

        if (possibleCityTag) {
          cityName = possibleCityTag;
        }
      }

      // Buscar en el contenido de la entrada
      if (cityName === 'Ciudad Desconocida' && entry.content) {
        const contentMatch = entry.content.match(/(?:en|in) ([A-Za-z\s]+)\.$/);
        if (contentMatch && contentMatch[1]) {
          cityName = contentMatch[1].trim();
        }
      }
    }

    if (!entriesByCity[cityName]) {
      entriesByCity[cityName] = [];
    }

    // Nos aseguramos de que todos los campos necesarios existan
    const processedEntry: CityJournalEntry = {
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

/**
 * Obtiene las entradas del diario relacionadas con una misión específica
 * @param userId ID del usuario
 * @param missionId ID de la misión
 * @returns Entradas del diario relacionadas con la misión
 */
export const getMissionJournalEntries = async (userId: string, missionId: string): Promise<CityJournalEntry[]> => {
  try {
    // Verificar qué tablas existen
    const { journalEntriesExists, journeyDiaryExists } = await checkJournalTables();

    if (!journalEntriesExists && !journeyDiaryExists) {
      console.warn('No se encontraron tablas para el diario (journal_entries o journey_diary)');
      return []; // Devolvemos un array vacío
    }

    let entriesData = null;
    let error = null;

    // Primero intentamos con journal_entries si existe
    if (journalEntriesExists) {
      try {
        // Intentamos con la relación a cities
        const { data, error: entriesError } = await supabase
          .from('journal_entries')
          .select(`
            *,
            cities:cityId (
              name
            )
          `)
          .eq('userId', userId)
          .eq('missionId', missionId)
          .order('created_at', { ascending: false });

        if (!entriesError) {
          entriesData = data;
        } else if (entriesError.message && (
          entriesError.message.includes('cityId') ||
          entriesError.message.includes('relationship') ||
          entriesError.code === 'PGRST200')) {

          // Si hay error de relación, intentamos sin la relación
          const { data: basicData, error: basicError } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('userId', userId)
            .eq('missionId', missionId)
            .order('created_at', { ascending: false });

          if (!basicError) {
            entriesData = basicData;
          } else {
            error = basicError;
          }
        } else {
          error = entriesError;
        }
      } catch (e) {
        console.warn('Error al obtener datos de journal_entries para misión:', e);
      }
    }

    // Si no obtuvimos datos de journal_entries o hubo error, intentamos con journey_diary
    if (!entriesData && journeyDiaryExists) {
      try {
        // Intentamos con la relación a cities
        const { data, error: diaryError } = await supabase
          .from('journey_diary')
          .select(`
            *,
            cities:cityId (
              name
            )
          `)
          .eq('userId', userId)
          .eq('missionId', missionId)
          .order('created_at', { ascending: false });

        if (!diaryError) {
          entriesData = data;
        } else if (diaryError.message && (
          diaryError.message.includes('cityId') ||
          diaryError.message.includes('relationship') ||
          diaryError.code === 'PGRST200')) {

          // Si hay error de relación, intentamos sin la relación
          const { data: basicData, error: basicError } = await supabase
            .from('journey_diary')
            .select('*')
            .eq('userId', userId)
            .eq('missionId', missionId)
            .order('created_at', { ascending: false });

          if (!basicError) {
            entriesData = basicData;
          } else if (!error) { // Solo guardamos este error si no teníamos uno previo
            error = basicError;
          }
        } else if (!error) { // Solo guardamos este error si no teníamos uno previo
          error = diaryError;
        }
      } catch (e) {
        console.warn('Error al obtener datos de journey_diary para misión:', e);
      }
    }

    // Si después de intentar con ambas tablas seguimos sin datos y tenemos un error, lo lanzamos
    if (!entriesData && error) {
      throw error;
    }

    // Si no hay datos (pero no hubo error), devolvemos un array vacío
    if (!entriesData || entriesData.length === 0) {
      return [];
    }

    // Procesamos las entradas para asegurar el formato correcto
    return entriesData.map((entry: any) => {
      let cityName = 'Ciudad Desconocida';

      if (entry.cities?.name) {
        cityName = entry.cities.name;
      } else if (entry.cityName) {
        cityName = entry.cityName;
      } else if (entry.city_name) {
        cityName = entry.city_name;
      } else if (entry.tags && Array.isArray(entry.tags)) {
        const cityTag = entry.tags.find((tag: string) =>
          tag !== 'misión' && tag !== 'mission' && tag !== 'viaje' && tag !== 'travel'
        );
        if (cityTag) {
          cityName = cityTag.charAt(0).toUpperCase() + cityTag.slice(1); // Capitalizar
        }
      }

      return {
        id: entry.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: entry.userId || '',
        cityId: entry.cityId || '',
        missionId: entry.missionId || missionId,
        title: entry.title || 'Entrada sin título',
        content: entry.content || '',
        photos: Array.isArray(entry.photos) ? entry.photos :
          (entry.photos ? [entry.photos] : []),
        location: entry.location || null,
        created_at: entry.created_at || new Date().toISOString(),
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        city_name: cityName
      };
    });
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

    // Validar datos requeridos
    if (!data.userId || !data.missionId) {
      throw new Error('userId y missionId son requeridos');
    }

    // Preparar datos base
    const baseData = {
      userid: data.userId,
      missionid: data.missionId,
      cityid: data.cityId === 'unknown' ? null : data.cityId,
      title: data.title,
      content: data.content || '',
      photos: Array.isArray(data.photos) ? data.photos : [data.photos],
      tags: Array.isArray(data.tags) ? data.tags : [],
      created_at: new Date().toISOString(),
      comments_visibility: data.comments_visibility || 'public'
    };

    console.log('🔄 Intentando insertar entrada con datos:', baseData);

    // Intentar insertar la entrada
    const { data: newEntry, error: insertError } = await supabase
      .from('journal_entries')
      .insert(baseData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error al insertar entrada:', insertError);
      throw insertError;
    }

    if (!newEntry) {
      throw new Error('No se pudo crear la entrada del diario');
    }

    console.log('✅ Entrada creada exitosamente:', newEntry);
    return newEntry;

  } catch (error) {
    console.error('❌ Error en createJournalEntry:', error);
    throw error;
  }
};

// Obtener comentarios de una entrada
export async function getCommentsByEntryId(entryId: string): Promise<JournalComment[]> {
  try {
    const { data, error } = await supabase
      .from('journal_comments')
      .select('*, users: user_id (username)')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Mapear para incluir username
    return (data || []).map((c: any) => ({
      ...c,
      username: c.users?.username || 'Usuario',
    }));
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    return [];
  }
}

// Insertar comentario en la tabla
export async function addCommentToEntryTable(entryId: string, userId: string, comment: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('journal_comments')
      .insert({ entry_id: entryId, user_id: userId, comment });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al insertar comentario:', error);
    return false;
  }
}

export const getJournalEntryById = async (entryId: string, currentUserId?: string): Promise<any> => {
  try {
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        cities:cityid (
          name
        )
      `)
      .eq('id', entryId)
      .single();

    const { data: entry, error } = await query;

    if (error) throw error;
    if (!entry) return null;

    // Si hay un usuario actual, verificar si es amigo del autor
    if (currentUserId && entry.userid !== currentUserId) {
      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user1Id.eq.${currentUserId},user2Id.eq.${entry.userid}),and(user1Id.eq.${entry.userid},user2Id.eq.${currentUserId})`)
        .single();

      entry.is_friend = !!friendship;
    }

    return entry;
  } catch (error) {
    console.error('Error al obtener entrada del diario:', error);
    throw error;
  }
}; 