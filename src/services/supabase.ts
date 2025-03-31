import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://ynyxyzzpbyzyejgkfncm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueXh5enpwYnl6eWVqZ2tmbmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODI4NDMsImV4cCI6MjA1NzM1ODg0M30.ntEnr5gFT5tllc0Z037LJPkPq60SM_RBLa6hct72xXs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      .from('challenges')
      .select('*')
      .eq('cityId', cityId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching challenges:', error);
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