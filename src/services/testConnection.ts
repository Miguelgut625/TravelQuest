import { supabase } from './supabase';

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Error conectando a Supabase:', error);
      return false;
    }
    
    console.log('Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.error('Error de conexión:', error);
    return false;
  }
};

// Función para crear la tabla missions_shared si no existe
export const createMissionsSharedTable = async () => {
  try {
    console.log('🔧 Verificando tabla missions_shared...');
    
    // Primero verificar si ya existe
    const { data: existingTable, error: checkError } = await supabase
      .from('missions_shared')
      .select('count')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Tabla missions_shared ya existe');
      return { success: true, message: 'Tabla ya existe' };
    }
    
    // Si no existe, intentaremos crear registros y ver qué pasa
    console.log('📋 Tabla missions_shared no encontrada, puede que no exista');
    console.log('💡 Puedes crear la tabla en Supabase SQL Editor con este comando:');
    
    const sqlCommand = `
-- Crear tabla para misiones compartidas
CREATE TABLE IF NOT EXISTS public.missions_shared (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id TEXT NOT NULL,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mission_id, shared_by_user_id, shared_with_user_id)
);

-- Habilitar RLS
ALTER TABLE public.missions_shared ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view missions shared with them" ON public.missions_shared
    FOR SELECT USING (shared_with_user_id = auth.uid());

CREATE POLICY "Users can view missions they shared" ON public.missions_shared
    FOR SELECT USING (shared_by_user_id = auth.uid());

CREATE POLICY "Users can share missions" ON public.missions_shared
    FOR INSERT WITH CHECK (shared_by_user_id = auth.uid());

CREATE POLICY "Users can delete their shared missions" ON public.missions_shared
    FOR DELETE USING (shared_with_user_id = auth.uid());

-- Índices para optimizar consultas
CREATE INDEX idx_missions_shared_with_user ON public.missions_shared(shared_with_user_id);
CREATE INDEX idx_missions_shared_by_user ON public.missions_shared(shared_by_user_id);
CREATE INDEX idx_missions_shared_mission ON public.missions_shared(mission_id);
`;
    
    console.log(sqlCommand);
    
    return { 
      success: false, 
      message: 'Tabla no existe. Crea la tabla usando el comando SQL mostrado en la consola.',
      sqlCommand 
    };
    
  } catch (error) {
    console.error('Error verificando tabla missions_shared:', error);
    return { success: false, message: 'Error verificando tabla', error };
  }
};
