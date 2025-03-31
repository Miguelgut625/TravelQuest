import { supabase } from './supabase';
import { createJournalEntry } from './journalService';

export const getUserPoints = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('points')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        return data?.points || 0;
    } catch (error) {
        console.error('Error obteniendo puntos del usuario:', error);
        return 0; // Retornamos 0 en caso de error
    }
};

export const addPointsToUser = async (userId: string, points: number) => {
    try {
        // Primero obtenemos los puntos actuales
        const currentPoints = await getUserPoints(userId);

        // Actualizamos los puntos
        const { error } = await supabase
            .from('users')
            .update({
                points: currentPoints + points,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        return currentPoints + points;
    } catch (error) {
        console.error('Error añadiendo puntos al usuario:', error);
        throw error;
    }
};

export const completeMission = async (missionId: string, userId: string, imageUrl?: string) => {
    try {
        // Primero obtenemos los datos de la misión
        const { data: missionData, error: missionError } = await supabase
            .from('journeys_missions')
            .select(`
                id,
                journeyId,
                challenge:challenges (
                    id,
                    title,
                    description,
                    points
                )
            `)
            .eq('id', missionId)
            .single();

        if (missionError) throw missionError;

        // Marcar la misión como completada
        try {
            // Primero verificar qué columnas están disponibles
            const { data: columnInfo, error: columnError } = await supabase
                .rpc('get_table_columns', { table_name: 'journeys_missions' });
                
            // Columnas disponibles
            const hasPhotoUrl = columnInfo?.some(col => col === 'photo_url');
            const hasPictureUrl = columnInfo?.some(col => col === 'picture_url');
            
            let updateData: any = {
                completed: true,
                completed_at: new Date().toISOString()
            };
            
            // Añadir la URL de la imagen a la columna correcta si existe
            if (imageUrl) {
                if (hasPictureUrl) {
                    updateData.picture_url = imageUrl;
                } else if (hasPhotoUrl) {
                    updateData.photo_url = imageUrl;
                }
            }
            
            const { error: updateError } = await supabase
                .from('journeys_missions')
                .update(updateData)
                .eq('id', missionId);

            if (updateError) throw updateError;
            
        } catch (error: any) {
            // Si hay un error específico con las columnas, intentamos de nuevo
            if (error.message && 
                (error.message.includes('picture_url') || 
                 error.message.includes('photo_url') ||
                 error.message.includes('column'))) {
                console.warn('Error con la columna de imagen pero continuando');
            } else {
                throw error;
            }
        }

        // Añadir los puntos al usuario
        const points = missionData.challenge.points;
        await addPointsToUser(userId, points);

        // Si hay una imagen, intentamos agregar una entrada al diario
        if (imageUrl) {
            try {
                // Obtener información de la ciudad
                const { data: journeyData, error: journeyError } = await supabase
                    .from('journeys')
                    .select(`
                        id,
                        cityId,
                        cities (name)
                    `)
                    .eq('id', missionData.journeyId)
                    .single();

                if (journeyError) {
                    console.warn('Error obteniendo datos de journey:', journeyError);
                    return points; // Retornamos puntos y no creamos entrada en el diario
                }

                // Intentamos crear una entrada en el diario con la imagen
                try {
                    // Preparar datos con diferentes convenciones para probar
                    const entryData = {
                        userId: userId,
                        cityId: journeyData.cityId,
                        missionId: missionId,
                        title: missionData.challenge.title || 'Misión completada',
                        content: `Misión completada: ${missionData.challenge.description || ''}`,
                        photos: [imageUrl],
                        tags: ['misión', journeyData.cities?.name?.toLowerCase() || 'ciudad']
                    };
                    
                    // Usar nuestra función mejorada de creación de entradas
                    const success = await createJournalEntry(entryData);
                    
                    if (!success) {
                        console.warn('No se pudo crear la entrada en el diario, pero la misión fue completada');
                    } else {
                        console.log('Entrada de diario creada exitosamente');
                    }
                } catch (journalErr) {
                    console.warn('Error al intentar crear entrada en el diario, pero la misión ha sido completada:', journalErr);
                }
            } catch (err) {
                console.warn('Error en el proceso de creación del diario, pero la misión ha sido completada:', err);
            }
        }

        return points;
    } catch (error) {
        console.error('Error completando la misión:', error);
        throw error;
    }
}; 