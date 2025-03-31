import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('challenges') // Cambia 'missions' por cualquier tabla que tengas
      .select('*')
      .limit(1); // Limitar a 1 para una prueba rápida

    if (error) {
      console.error('Error fetching data:', error);
      return false; // Conexión fallida
    }

    console.log('Data fetched successfully:', data);
    return true; // Conexión exitosa
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    return false; // Conexión fallida
  }
};
