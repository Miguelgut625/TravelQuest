import { supabase } from './supabase';

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
