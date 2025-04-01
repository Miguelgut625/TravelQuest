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
}

export interface CityJournalEntry extends JournalEntryDB {
  city_name: string;
}

/**
 * Verifica si existe la tabla journal_entries o journey_diary en la base de datos
 * @returns objeto con la información de qué tablas existen
 */
export const checkJournalTables = async (): Promise<{journalEntriesExists: boolean, journeyDiaryExists: boolean}> => {
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
    let cityName = 'Ciudad Desconocida';
    
    // Orden de prioridad para obtener el nombre de la ciudad
    if (!missingCityRelation && entry.cities?.name) {
      cityName = entry.cities.name;
    } else if (entry.city_name) {
      cityName = entry.city_name;
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
}) => {
  try {
    console.log('Intentando crear entrada de diario con datos:', data);
    
    // Primero, obtener el nombre de la ciudad usando cityId
    let cityName = null;
    try {
      // Consulta directa a la tabla cities
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('name')
        .eq('id', data.cityId)
        .single();
      
      if (!cityError && cityData && cityData.name) {
        cityName = cityData.name;
        console.log('Nombre de ciudad encontrado:', cityName);
      } else {
        console.warn('No se pudo obtener el nombre de la ciudad (1):', cityError);
        
        // Intento alternativo: buscar en journeys
        const { data: journeyData, error: journeyError } = await supabase
          .from('journeys')
          .select(`
            cities (
              name
            )
          `)
          .eq('cityId', data.cityId)
          .single();
        
        if (!journeyError && journeyData && journeyData.cities && journeyData.cities.name) {
          cityName = journeyData.cities.name;
          console.log('Nombre de ciudad encontrado en journeys:', cityName);
        } else {
          console.warn('No se pudo obtener el nombre de la ciudad (2):', journeyError);
        }
      }
    } catch (e) {
      console.warn('Error al buscar el nombre de la ciudad:', e);
    }
    
    // Si no pudimos obtener el nombre de la ciudad, vamos a intentar con datos de la misión
    if (!cityName) {
      try {
        // Buscar en la tabla journeys_missions
        const { data: missionData, error: missionError } = await supabase
          .from('journeys_missions')
          .select(`
            journeyId,
            journey:journeyId (
              cityId,
              cities:cityId (
                name
              )
            )
          `)
          .eq('id', data.missionId)
          .single();
        
        if (!missionError && missionData?.journey?.cities?.name) {
          cityName = missionData.journey.cities.name;
          console.log('Nombre de ciudad encontrado a través de la misión:', cityName);
        } else {
          console.warn('No se pudo obtener el nombre a través de la misión:', missionError);
        }
      } catch (e) {
        console.warn('Error buscando ciudad a través de misión:', e);
      }
    }
    
    // Si todavía no tenemos nombre, usar algún valor por defecto
    if (!cityName) {
      // Último intento: verificar si hay texto en el contenido que indique la ciudad
      const contentCityMatch = data.content.match(/(?:en|in) ([A-Za-z\s]+)\.$/);
      if (contentCityMatch && contentCityMatch[1]) {
        cityName = contentCityMatch[1].trim();
        console.log('Nombre de ciudad extraído del contenido:', cityName);
      } else {
        cityName = 'Ciudad Desconocida';
        console.warn('Usando nombre de ciudad por defecto');
      }
    }
    
    // Añadir el nombre de la ciudad a las etiquetas
    const updatedTags = [...(data.tags || [])];
    if (cityName && !updatedTags.includes(cityName)) {
      updatedTags.push(cityName);
    }
    
    // Preparar diferentes versiones de datos para la inserción con nombres de columnas alternativos
    const insertDataOptions = [
      // Versión 1: snake_case (formato tradicional PostgreSQL)
      {
        user_id: data.userId,
        city_id: data.cityId,
        mission_id: data.missionId,
        title: data.title,
        content: data.content,
        photos: data.photos,
        city_name: cityName,
        created_at: new Date().toISOString(),
        tags: updatedTags
      },
      // Versión 2: camelCase
      {
        userId: data.userId,
        cityId: data.cityId,
        missionId: data.missionId,
        title: data.title,
        content: data.content,
        photos: data.photos,
        cityName: cityName,
        created_at: new Date().toISOString(),
        tags: updatedTags
      },
      // Versión 3: lowercase
      {
        userid: data.userId,
        cityid: data.cityId,
        missionid: data.missionId,
        title: data.title,
        content: data.content,
        photos: data.photos,
        cityname: cityName,
        created_at: new Date().toISOString(),
        tags: updatedTags
      }
    ];
    
    // Intentar cada formato de nombres de columnas
    for (const insertData of insertDataOptions) {
      try {
        console.log('Intentando insertar con formato:', insertData);
        const { error } = await supabase.from('journal_entries').insert(insertData);
        
        if (!error) {
          console.log('Entrada creada exitosamente con formato:', insertData);
          return true;
        }
        
        console.warn('Error al insertar con este formato:', error);
      } catch (e) {
        console.warn('Excepción al insertar con este formato:', e);
      }
    }
    
    // Si llegamos aquí, ninguno de los formatos funcionó
    console.error('No se pudo crear entrada en el diario con ningún formato');
    return false;
  } catch (error) {
    console.error('Error inesperado al crear entrada en el diario:', error);
    return false;
  }
}; 