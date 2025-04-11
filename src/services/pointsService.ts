import { supabase } from './supabase';
import { createJournalEntry } from './journalService';
import { addExperienceToUser } from './experienceService';

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
        
        // Añadir experiencia al usuario (relación 1:1 entre puntos y experiencia)
        await addExperienceToUser(userId, points);

        return currentPoints + points;
    } catch (error) {
        console.error('Error añadiendo puntos al usuario:', error);
        throw error;
    }
};

export const completeMission = async (missionId: string, userId: string, imageUrl?: string) => {
    console.log('Iniciando completeMission con parámetros:', { missionId, userId, imageUrl });
    
    try {
        // Verificar que tenemos los datos necesarios
        if (!missionId || !userId) {
            console.error('Parámetros inválidos:', { missionId, userId });
            throw new Error('Parámetros inválidos para completar misión');
        }
        
        // Obtener datos de la misión para asignar puntos
        console.log('Obteniendo datos de la misión...');
        const { data: missionData, error: missionError } = await supabase
            .from('journeys_missions')
            .select(`
                id,
                journeyId,
                challengeId,
                completed,
                challenges (
                    id,
                    title,
                    points
                )
            `)
            .eq('id', missionId)
            .single();

        if (missionError || !missionData) {
            console.error('Error al obtener datos de la misión:', missionError);
            throw missionError || new Error('No se encontró la misión');
        }

        console.log('Datos de misión obtenidos:', missionData);

        // Verificar que la misión no esté ya completada
        if (missionData.completed) {
            console.warn('La misión ya está completada');
            return missionData.challenges.points;
        }

        // Marcar la misión como completada
        console.log('Marcando misión como completada...');
        
        // Preparar datos para la actualización
        const updateData: any = {
            completed: true,
            completed_at: new Date().toISOString()
        };
        
        // Añadir URL de imagen si existe - CORREGIDO para usar directamente picture_url
        if (imageUrl) {
            console.log('Añadiendo URL de imagen a picture_url:', imageUrl);
            
            try {
                // Usar directamente picture_url
                updateData.picture_url = imageUrl;
                const { error } = await supabase
                    .from('journeys_missions')
                    .update(updateData)
                    .eq('id', missionId);
                    
                if (error) {
                    console.error('Error al actualizar con picture_url:', error.message);
                    // Si falla, actualizar sin la imagen
                    delete updateData.picture_url;
                    const { error: error2 } = await supabase
                        .from('journeys_missions')
                        .update({ completed: true, completed_at: new Date().toISOString() })
                        .eq('id', missionId);
                        
                    if (error2) throw error2;
                }
            } catch (error: any) {
                console.warn('Error con la columna de imagen pero continuando:', error.message);
            }
        } else {
            // Si no hay imagen, solo actualizar el estado completado
            console.log('Actualizando sin imagen...');
            const { error } = await supabase
                .from('journeys_missions')
                .update({ completed: true, completed_at: new Date().toISOString() })
                .eq('id', missionId);
                
            if (error) throw error;
        }
        
        // Añadir los puntos al usuario
        const points = missionData.challenges.points;
        console.log('Añadiendo puntos al usuario:', points);
        await addPointsToUser(userId, points);
        
        // Si hay una imagen, intentamos agregar una entrada al diario
        if (imageUrl) {
            try {
                console.log('Creando entrada en el diario...');
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
                
                // Crear entrada en el diario
                console.log('Datos de journey obtenidos, creando entrada de diario:', journeyData);
                
                await createJournalEntry({
                    userId: userId,
                    cityId: journeyData.cityId,
                    missionId: missionId,
                    title: `Misión completada: ${missionData.challenges.title}`,
                    content: `He completado esta misión en ${journeyData.cities?.name || 'mi viaje'}.`,
                    photos: [imageUrl]
                });
                
                console.log('Entrada de diario creada exitosamente');
            } catch (error) {
                console.warn('Error creando entrada en el diario, pero la misión se completó:', error);
                // No lanzamos el error para no interrumpir el flujo
            }
        }

        console.log('Misión completada exitosamente, retornando puntos:', points);
        return points;
    } catch (error) {
        console.error('Error en completeMission:', error);
        throw error;
    }
}; 