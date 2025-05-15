import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { LOGGING_CONFIG } from '../config/logging';

const supabaseUrl = 'https://ynyxyzzpbyzyejgkfncm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueXh5enpwYnl6eWVqZ2tmbmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODI4NDMsImV4cCI6MjA1NzM1ODg0M30.ntEnr5gFT5tllc0Z037LJPkPq60SM_RBLa6hct72xXs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    debug: LOGGING_CONFIG.CATEGORIES.AUTH
  }
});

// Agregar un listener para errores de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);

  // Si el token expiró o hubo un error, intentamos refrescar la sesión
  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    console.log('Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});

// Función para refrescar manualmente la sesión
export const refreshSession = async () => {
  try {
    console.log('Intentando refrescar la sesión...');
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Error refreshing session:', error);
      return { success: false, error };
    }

    console.log('Sesión refrescada exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado al refrescar sesión:', error);
    return { success: false, error };
  }
};

// Función para verificar y refrescar la sesión antes de operaciones críticas
export const ensureValidSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('No hay sesión activa');
      return { valid: false };
    }

    // Verificar si el token expira en menos de 5 minutos
    const expiresAt = new Date(session.expires_at || 0);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      console.log('Token cerca de expirar, refrescando...');
      const { success, data, error } = await refreshSession();

      if (!success) {
        console.error('No se pudo refrescar el token:', error);
        return { valid: false, error };
      }

      return { valid: true, session: data.session };
    }

    return { valid: true, session };
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    return { valid: false, error };
  }
};

// Función para probar la autenticación
export const testAuth = async (email: string, password: string) => {
  try {
    console.log('Probando autenticación con:', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Error en prueba de autenticación:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      return { success: false, error };
    }

    console.log('Prueba de autenticación exitosa:', {
      user: data.user?.email,
      session: !!data.session
    });
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado en prueba de autenticación:', error);
    return { success: false, error };
  }
};

// Funciones auxiliares para interactuar con Supabase
export const uploadImage = async (filePath: string, bucket: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, filePath);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const getMissionsByCity = async (cityId: string) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('cityId', cityId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching missions:', error);
    throw error;
  }
};

export const updateMissionProgress = async (missionId: string, userId: string, completed: boolean) => {
  try {
    const { data, error } = await supabase
      .from('mission_progress')
      .upsert({
        mission_id: missionId,
        user_id: userId,
        completed,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating mission progress:', error);
    throw error;
  }
};

// Función para verificar credenciales de forma segura
export const verifyCredentials = async (email: string, password: string) => {
  try {
    console.log('Verificando credenciales para:', email);

    // Usar el sistema de autenticación incorporado de Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Error en autenticación:', authError);
      return { success: false, error: authError };
    }

    if (!authData.user) {
      console.log('No se encontró el usuario');
      return { success: false, error: new Error('Usuario no encontrado') };
    }

    // Obtener datos adicionales del usuario si es necesario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error obteniendo datos del usuario:', userError);
      return { success: false, error: userError };
    }

    const userInfo = {
      ...userData,
      email: authData.user.email
    };

    console.log('Autenticación exitosa para:', email);
    return { success: true, data: userInfo };
  } catch (error) {
    console.error('Error inesperado en autenticación:', error);
    return { success: false, error };
  }
};

export const searchCities = async (searchTerm: string) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
};

// Función para obtener las ciudades donde el usuario tiene viajes
export const getUserJourneyCities = async (userId: string) => {
  try {
    // Obtenemos los viajes del usuario y las ciudades relacionadas
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        id,
        cityId,
        cities (
          id,
          name
        )
      `)
      .eq('userId', userId);

    if (error) {
      console.error('Error obteniendo ciudades de viajes:', error);
      return [];
    }

    // Filtrar para obtener solo ciudades válidas y eliminar duplicados
    const uniqueCities = data
      .filter(journey => journey.cities && journey.cities.id && journey.cities.name)
      .map(journey => journey.cities)
      .filter((city, index, self) =>
        index === self.findIndex((c) => c.id === city.id)
      );

    return uniqueCities;
  } catch (error) {
    console.error('Error obteniendo ciudades de viajes del usuario:', error);
    return [];
  }
};

// Función para obtener datos del clima por nombre de ciudad
export const getWeatherByCity = async (cityName: string, apiKey: string) => {
  try {
    // Hacemos la petición a OpenWeatherMap API usando el nombre de la ciudad
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&lang=es&appid=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Error al obtener datos del clima: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Verificar si la respuesta contiene un error
    if (data.cod && data.cod !== 200) {
      throw new Error(`Error en la respuesta del clima: ${data.message || 'Código de error: ' + data.cod}`);
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo datos del clima por ciudad:', error);
    throw error;
  }
};

export const getCityIdByName = async (cityName: string): Promise<string> => {
  try {
    // Primero intentamos encontrar la ciudad exacta
    const { data, error } = await supabase
      .from('cities')
      .select('id')
      .ilike('name', cityName)
      .single();

    if (!error && data) {
      return data.id;
    }

    // Si no encontramos la ciudad, intentamos una búsqueda más flexible
    const { data: fuzzyData, error: fuzzyError } = await supabase
      .from('cities')
      .select('id')
      .ilike('name', `%${cityName}%`)
      .single();

    if (!fuzzyError && fuzzyData) {
      return fuzzyData.id;
    }

    // Si aún no encontramos la ciudad, la creamos
    const { data: newCity, error: insertError } = await supabase
      .from('cities')
      .insert([{ name: cityName }])
      .select('id')
      .single();

    if (insertError) throw insertError;
    if (!newCity) throw new Error('No se pudo crear la ciudad');

    return newCity.id;
  } catch (error) {
    console.error('Error en getCityIdByName:', error);
    throw error;
  }
}; 