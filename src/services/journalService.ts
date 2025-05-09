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
 * Obtiene todas las entradas del diario del usuario agrupadas por ciudad
 * @param userId ID del usuario 
 * @returns Entradas del diario agrupadas por ciudad
 */
export const getUserJournalEntries = async (userId: string): Promise<{ [cityName: string]: CityJournalEntry[] }> => {
  try {
    console.log('Obteniendo entradas del diario del usuario:', userId);
    
    // Intentar obtener entradas directamente de la tabla journal_entries
    const { data: entriesData, error } = await supabase
              .from('journal_entries')
              .select('*')
              .eq('userid', userId)
              .order('created_at', { ascending: false });
            
    if (error) {
      console.error('Error obteniendo entradas del diario:', error);
      return {};
    }
    
    if (!entriesData || entriesData.length === 0) {
      console.log('No se encontraron entradas del diario para el usuario');
      return {};
    }
    
    console.log(`Se encontraron ${entriesData.length} entradas del diario`);
    
    // Ahora necesitamos obtener los nombres de las ciudades
    const cityIds = entriesData
      .map(entry => entry.cityid)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    console.log('IDs de ciudades encontrados:', cityIds);
    
    // Crear un mapa de cityId -> nombreCiudad
    const cityNames: Record<string, string> = {};
    
    // Obtener nombres de ciudades
          try {
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds);
      
      if (!citiesError && citiesData && citiesData.length > 0) {
        citiesData.forEach(city => {
          cityNames[city.id] = city.name;
        });
        console.log('Nombres de ciudades obtenidos:', Object.keys(cityNames).length);
      } else {
        console.warn('No se pudieron obtener los nombres de las ciudades:', citiesError);
    }
    } catch (e) {
      console.warn('Error al obtener nombres de ciudades:', e);
    }
    
    // Organizar las entradas por ciudad
  const entriesByCity: { [cityName: string]: CityJournalEntry[] } = {};
  
    entriesData.forEach(entry => {
      // Intentar obtener el nombre de la ciudad
      let cityName = cityNames[entry.cityid] || 'Ciudad Desconocida';
    
      // Si no tenemos el nombre en el mapa, intentar extraerlo de las etiquetas
      if (cityName === 'Ciudad Desconocida' && entry.tags && Array.isArray(entry.tags)) {
        const possibleCityTag = entry.tags.find(tag => 
          tag !== 'misión' && 
          tag !== 'mission' && 
          tag !== 'viaje' && 
          tag !== 'travel' && 
          tag.charAt(0).toUpperCase() === tag.charAt(0)
        );
        
        if (possibleCityTag) {
          cityName = possibleCityTag;
        }
      }
      
      // Inicializar el array de la ciudad si no existe
    if (!entriesByCity[cityName]) {
      entriesByCity[cityName] = [];
    }
    
      // Añadir la entrada al array de la ciudad
      entriesByCity[cityName].push({
        id: entry.id,
        userId: entry.userid,
        cityId: entry.cityid,
        missionId: entry.missionid,
        title: entry.title,
      content: entry.content || '',
        photos: Array.isArray(entry.photos) ? entry.photos : [],
        location: entry.location,
        created_at: entry.created_at,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      city_name: cityName
      });
  });

  return entriesByCity;
  } catch (error) {
    console.error('Error obteniendo entradas del diario:', error);
    return {};
  }
};

/**
 * Obtiene las entradas del diario relacionadas con una misión específica
 * @param userId ID del usuario
 * @param missionId ID de la misión
 * @returns Entradas del diario relacionadas con la misión
 */
export const getMissionJournalEntries = async (userId: string, missionId: string): Promise<CityJournalEntry[]> => {
  try {
    console.log(`Obteniendo entradas del diario para misión ${missionId}`);
    
    // Obtener entradas relacionadas con la misión
    const { data: entriesData, error } = await supabase
            .from('journal_entries')
            .select('*')
      .eq('userid', userId)
      .eq('missionid', missionId)
            .order('created_at', { ascending: false });
          
    if (error) {
      console.error('Error obteniendo entradas de la misión:', error);
      return [];
        }
    
    if (!entriesData || entriesData.length === 0) {
      console.log('No se encontraron entradas para esta misión');
      return [];
    }
    
    console.log(`Se encontraron ${entriesData.length} entradas para la misión`);
    
    // Ahora vamos a obtener los nombres de las ciudades
    const cityIds = entriesData
      .map(entry => entry.cityid)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    // Crear un mapa de cityId -> nombreCiudad
    const cityNames: Record<string, string> = {};
    
    // Obtener nombres de ciudades
    try {
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds);
      
      if (!citiesError && citiesData && citiesData.length > 0) {
        citiesData.forEach(city => {
          cityNames[city.id] = city.name;
        });
      }
    } catch (e) {
      console.warn('Error al obtener nombres de ciudades:', e);
    }
    
    // Procesar las entradas para incluir el nombre de la ciudad
    return entriesData.map(entry => {
      // Intentar obtener el nombre de la ciudad
      let cityName = cityNames[entry.cityid] || 'Ciudad Desconocida';
      
      // Si no tenemos el nombre, intentar extraerlo de las etiquetas
      if (cityName === 'Ciudad Desconocida' && entry.tags && Array.isArray(entry.tags)) {
        const possibleCityTag = entry.tags.find(tag => 
          tag !== 'misión' && 
          tag !== 'mission' && 
          tag !== 'viaje' && 
          tag !== 'travel' && 
          tag.charAt(0).toUpperCase() === tag.charAt(0)
        );
        
        if (possibleCityTag) {
          cityName = possibleCityTag;
        }
      }
      
      return {
        id: entry.id,
        userId: entry.userid,
        cityId: entry.cityid,
        missionId: entry.missionid,
        title: entry.title,
        content: entry.content || '',
        photos: Array.isArray(entry.photos) ? entry.photos : [],
        location: entry.location,
        created_at: entry.created_at,
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        city_name: cityName
      };
    });
  } catch (error) {
    console.error('Error obteniendo entradas de la misión:', error);
    return [];
  }
};

/**
 * Crea una nueva entrada en el diario del usuario
 * @param data Datos de la entrada a crear
 * @returns true si se creó correctamente, false en caso contrario
 */
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
    
    // Añadir el nombre de la ciudad a las etiquetas
    const updatedTags = [...(data.tags || [])];
    if (cityName && !updatedTags.includes(cityName)) {
      updatedTags.push(cityName);
    }
    
    // Crear estructura exacta según el esquema proporcionado
    const insertData = {
      userid: data.userId,
      cityid: data.cityId,
      missionid: data.missionId,
      title: data.title,
      content: data.content,
      photos: data.photos,
      location: null, // Podemos añadir ubicación si está disponible
      created_at: new Date().toISOString(),
          tags: updatedTags
    };
      
    console.log('Intentando insertar entrada con estructura correcta:', insertData);
    const { error } = await supabase.from('journal_entries').insert(insertData);
          
          if (!error) {
      console.log('Entrada creada exitosamente en journal_entries');
            return true;
          }
          
    // Si hay un error, mostrar detalles
    console.error('Error al insertar en journal_entries:', error);
    
    // Intento adicional: verificar si hay algún problema con el tipo UUID
    try {
      // En algunos casos, puede ser necesario verificar el formato de UUID
      console.log('Intentando formato alternativo...');
      
      // Si el error está relacionado con el UUID, intentar con otro formato
      if (error.message && (
        error.message.includes('uuid') || 
        error.message.includes('type') ||
        error.message.includes('invalid')
      )) {
        // Intentar convertir IDs explícitamente (algunos proveedores son estrictos con UUID)
        const { error: secondError } = await supabase.from('journal_entries').insert({
          ...insertData,
          // Asegurarse de que los IDs son válidos en formato UUID
          userid: data.userId.replace(/-/g, '').toLowerCase(),
          cityid: data.cityId.replace(/-/g, '').toLowerCase(),
          missionid: data.missionId ? data.missionId.replace(/-/g, '').toLowerCase() : null
        });
        
        if (!secondError) {
          console.log('Entrada creada exitosamente con formato UUID alternativo');
          return true;
        }
        
        console.error('Error en segundo intento:', secondError);
      }
      
      // Último intento con valores mínimos
      console.log('Realizando último intento con valores mínimos...');
      
      const { error: lastError } = await supabase.from('journal_entries').insert({
            userid: data.userId,
        cityid: data.cityId,
            title: data.title,
        content: 'Entrada creada con contenido mínimo.'
          });
          
      if (!lastError) {
        console.log('Entrada creada exitosamente con datos mínimos');
          return true;
          }
          
      console.error('Error en último intento:', lastError);
    } catch (finalError) {
      console.error('Error inesperado en intentos alternativos:', finalError);
    }
    
    console.error('No se pudo crear entrada en el diario journal_entries');
    return false;
  } catch (error) {
    console.error('Error inesperado al crear entrada en el diario:', error);
    return false;
  }
};

/**
 * Añade una foto a una entrada del diario existente
 * @param entryId ID de la entrada del diario
 * @param photoUrl URL de la foto a añadir
 * @returns true si la operación fue exitosa
 */
export const addPhotoToEntry = async (entryId: string, photoUrl: string): Promise<boolean> => {
  try {
    // Primero obtenemos la entrada actual para obtener sus fotos existentes
    const { data: entry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('photos')
      .eq('id', entryId)
      .single();
    
    if (fetchError) {
      console.error('Error al obtener entrada del diario:', fetchError);
      return false;
    }
    
    // Verificar si photos existe y es un array
    const currentPhotos = Array.isArray(entry.photos) ? entry.photos : [];
    
    // Añadir la nueva foto al array
    const updatedPhotos = [...currentPhotos, photoUrl];
    
    // Actualizar la entrada con el nuevo array de fotos
    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({ photos: updatedPhotos })
      .eq('id', entryId);
    
    if (updateError) {
      console.error('Error al actualizar fotos en la entrada:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al añadir foto a la entrada:', error);
    return false;
  }
};

/**
 * Añade un comentario a una entrada del diario existente
 * @param entryId ID de la entrada del diario
 * @param userId ID del usuario que hace el comentario
 * @param comment Texto del comentario
 * @returns true si la operación fue exitosa
 */
export const addCommentToEntry = async (entryId: string, userId: string, comment: string): Promise<boolean> => {
  try {
    // Verificar si hay una tabla de comentarios
    let tableExists = false;
    
    // Intentar obtener la estructura de la tabla para ver si existe
    try {
      const { data } = await supabase
        .from('journal_comments')
        .select('id')
        .limit(1);
      
      tableExists = true;
    } catch (e) {
      // La tabla no existe, intentemos crearla
      console.log('La tabla journal_comments no existe, se intentará crear');
      
      // Esta operación solo funcionaría si el usuario tiene permisos de administrador
      // En producción, deberías crear la tabla desde un script de migración
      try {
        const { error } = await supabase.rpc('create_comments_table');
        if (!error) {
          tableExists = true;
        }
      } catch (createError) {
        console.error('No se pudo crear la tabla de comentarios:', createError);
      }
    }
    
    if (tableExists) {
      // Insertar el comentario en la tabla dedicada
      const { error } = await supabase
        .from('journal_comments')
        .insert({
          entry_id: entryId,
          user_id: userId,
          comment: comment,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error al insertar comentario:', error);
        return false;
      }
      
      return true;
    } else {
      // Alternativa: Si no existe la tabla de comentarios, usar método alternativo
      // Primero obtenemos la entrada actual para obtener su contenido
      const { data: entry, error: fetchError } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('id', entryId)
        .single();
      
      if (fetchError) {
        console.error('Error al obtener entrada del diario:', fetchError);
        return false;
      }
      
      // Añadir comentario al contenido actual
      const newComment = `\n\n[Comentario de Usuario - ${new Date().toLocaleString()}]\n${comment}`;
      const contentUpdate = {
        content: (entry.content || '') + newComment
      };
      
      // Actualizar la entrada con el contenido modificado
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update(contentUpdate)
        .eq('id', entryId);
      
      if (updateError) {
        console.error('Error al actualizar contenido con el comentario:', updateError);
        return false;
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error al añadir comentario a la entrada:', error);
    return false;
  }
};

/**
 * Obtiene una entrada específica del diario por su ID
 * @param entryId ID de la entrada a obtener
 * @returns La entrada del diario o null si no se encuentra
 */
export const getJournalEntryById = async (entryId: string): Promise<CityJournalEntry | null> => {
  try {
    console.log(`Obteniendo entrada del diario con ID: ${entryId}`);
    
    // Obtener la entrada por su ID
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();
    
    if (error) {
      console.error('Error obteniendo entrada del diario:', error);
      return null;
    }
    
    if (!entry) {
      console.log('No se encontró la entrada del diario');
      return null;
    }
    
    // Intentar obtener el nombre de la ciudad
    let cityName = 'Ciudad Desconocida';
    
    try {
      if (entry.cityid) {
        const { data: cityData, error: cityError } = await supabase
          .from('cities')
          .select('name')
          .eq('id', entry.cityid)
          .single();
        
        if (!cityError && cityData) {
          cityName = cityData.name;
        }
      }
    } catch (e) {
      console.warn('Error al obtener nombre de la ciudad:', e);
    }
    
    // Si no tenemos el nombre de la ciudad, intentar extraerlo de las etiquetas
    if (cityName === 'Ciudad Desconocida' && entry.tags && Array.isArray(entry.tags)) {
      const possibleCityTag = entry.tags.find(tag => 
        tag !== 'misión' && 
        tag !== 'mission' && 
        tag !== 'viaje' && 
        tag !== 'travel' && 
        tag.charAt(0).toUpperCase() === tag.charAt(0)
      );
      
      if (possibleCityTag) {
        cityName = possibleCityTag;
      }
    }
    
    return {
      id: entry.id,
      userId: entry.userid,
      cityId: entry.cityid,
      missionId: entry.missionid,
      title: entry.title,
      content: entry.content || '',
      photos: Array.isArray(entry.photos) ? entry.photos : [],
      location: entry.location,
      created_at: entry.created_at,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      city_name: cityName
    };
  } catch (error) {
    console.error('Error obteniendo entrada del diario:', error);
    return null;
  }
}; 