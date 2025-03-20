import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('Probando conexión con Supabase...');
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error de conexión:', error);
      return false;
    }

    console.log('Conexión exitosa con Supabase');
    return true;
  } catch (error) {
    console.error('Error al conectar con Supabase:', error);
    return false;
  }
};
