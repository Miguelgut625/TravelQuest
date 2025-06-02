import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynyxyzzpbyzyejgkfncm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueXh5enpwYnl6eWVqZ2tmbmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODI4NDMsImV4cCI6MjA1NzM1ODg0M30.ntEnr5gFT5tllc0Z037LJPkPq60SM_RBLa6hct72xXs';

// Crear un adaptador de almacenamiento para la web que utilice localStorage
const webStorage = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return Promise.resolve(value);
    } catch (error) {
      console.error('Error al obtener del localStorage:', error);
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
      return Promise.resolve();
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (error) {
      console.error('Error al eliminar del localStorage:', error);
      return Promise.resolve();
    }
  }
};

// Para modo simulado en desarrollo
const MOCK_MODE = true;

// Cliente Supabase para web
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  }
});

// Simulación de datos para desarrollo
const mockCities = [
  { id: '1', name: 'MADRID', latitude: 40.416775, longitude: -3.703790 },
  { id: '2', name: 'BARCELONA', latitude: 41.385064, longitude: 2.173404 },
  { id: '3', name: 'VALENCIA', latitude: 39.469907, longitude: -0.376288 },
  { id: '4', name: 'SEVILLA', latitude: 37.389092, longitude: -5.984459 },
  { id: '5', name: 'BILBAO', latitude: 43.263013, longitude: -2.934985 },
];

// Funciones del API
export const testAuth = async (email: string, password: string) => {
  if (MOCK_MODE) {
    console.log('Modo simulado: Autenticación correcta');
    return { 
      success: true, 
      data: {
        user: { email, id: '123' },
        session: { access_token: 'fake-token' }
      } 
    };
  }

  try {
    console.log('Probando autenticación con:', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Error en prueba de autenticación:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado en prueba de autenticación:', error);
    return { success: false, error };
  }
};

export const uploadImage = async (filePath: string, bucket: string) => {
  if (MOCK_MODE) {
    console.log('Modo simulado: Imagen cargada correctamente');
    return { path: filePath };
  }

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
  if (MOCK_MODE) {
    console.log('Modo simulado: Devolviendo misiones para la ciudad', cityId);
    return [
      { id: '1', title: 'Visita el Museo del Prado', description: 'Explora uno de los museos más importantes del mundo', cityId },
      { id: '2', title: 'Paseo por el Retiro', description: 'Disfruta de la naturaleza en el corazón de la ciudad', cityId },
      { id: '3', title: 'Tapeo en La Latina', description: 'Prueba las mejores tapas de la zona', cityId },
    ];
  }

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
  if (MOCK_MODE) {
    console.log('Modo simulado: Progreso de misión actualizado');
    return { id: missionId, completed };
  }

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

export const verifyCredentials = async (email: string, password: string) => {
  if (MOCK_MODE) {
    console.log('Modo simulado: Credenciales verificadas para', email);
    return { 
      success: true, 
      data: {
        id: '123',
        email,
        username: email.split('@')[0],
        created_at: new Date().toISOString()
      } 
    };
  }

  try {
    console.log('Verificando credenciales para:', email);
    
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

    return { success: true, data: userInfo };
  } catch (error) {
    console.error('Error inesperado en autenticación:', error);
    return { success: false, error };
  }
};

export const searchCities = async (searchTerm: string) => {
  if (MOCK_MODE) {
    console.log('Modo simulado: Buscando ciudades con término', searchTerm);
    
    const filteredCities = mockCities.filter(city => 
      city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filteredCities;
  }

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