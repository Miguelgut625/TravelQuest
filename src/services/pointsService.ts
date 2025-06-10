import { supabase } from './supabase';
import { createJournalEntry } from './journalService';
import { addExperienceToUser } from './experienceService';
import { analyzeImage } from './aiService';

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
    console.log('Iniciando completeMission con parámetros:', { missionId, userId, imageUrl: imageUrl ? 'imagen proporcionada' : 'sin imagen' });

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
                    points,
                    description
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


        // Añadir URL de imagen si existe
        if (imageUrl) {
            console.log('Añadiendo URL de imagen a picture_url');
            updateData.picture_url = imageUrl;
        }

        // Actualizar el estado de la misión
        try {
            const { error: updateError } = await supabase
                .from('journeys_missions')
                .update(updateData)
                .eq('id', missionId);

            if (updateError) {
                console.error('Error al actualizar misión:', updateError);
                throw updateError;
            }
        } catch (updateErr) {
            console.error('Error en la operación de actualización:', updateErr);
            throw updateErr;
        }

        // Añadir los puntos al usuario
        const points = missionData.challenges.points;
        console.log('Añadiendo puntos al usuario:', points);
        await addPointsToUser(userId, points);

        return points;

    } catch (error) {
        console.error('Error completando misión:', error);
        throw error;
    }
};

/**
 * Resta puntos al usuario
 * @param userId ID del usuario
 * @param points Cantidad de puntos a restar
 * @returns Puntos restantes después de la operación
 */
export const deductPointsFromUser = async (userId: string, points: number) => {
    try {
        // Primero obtenemos los puntos actuales
        const currentPoints = await getUserPoints(userId);
        
        // Verificar si hay puntos suficientes
        if (currentPoints < points) {
            throw new Error(`Puntos insuficientes. Se necesitan ${points} puntos.`);
        }

        // Restar los puntos
        const { error } = await supabase
            .from('users')
            .update({
                points: currentPoints - points,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        return currentPoints - points;
    } catch (error) {
        console.error('Error restando puntos al usuario:', error);
        throw error;
    }
};

/**
 * Genera una descripción detallada para el diario cuando la IA falla
 * @param cityName Nombre de la ciudad
 * @param missionTitle Título de la misión
 * @param isArtMission Indica si la misión está relacionada con arte
 * @returns Descripción generada
 */
const generateFallbackDescription = (cityName: string, missionTitle: string, isArtMission: boolean): string => {
    // Frases introductorias
    const intros = [
        `Hoy he completado una misión fascinante en ${cityName}.`,
        `Durante mi viaje por ${cityName}, he logrado completar una de mis misiones.`,
        `Mi aventura en ${cityName} continúa, y he documentado este momento especial.`,
        `Explorando ${cityName}, he tenido la oportunidad de completar esta misión.`,
        `Mi recorrido por ${cityName} me ha permitido vivir esta experiencia única.`
    ];

    // Frases sobre el ambiente
    const ambience = [
        "El ambiente era realmente encantador, con una luz perfecta para capturar el momento.",
        "El entorno era impresionante, lleno de color, vida y energía local.",
        "Las calles estaban llenas de gente local y otros viajeros, todos disfrutando del lugar.",
        "La arquitectura y el ambiente del lugar me transportaron a otra época.",
        "El clima era perfecto, lo que añadió un toque especial a esta experiencia."
    ];

    // Descripciones de arte
    const artDescriptions = [
        "La obra destacaba por su técnica magistral y la rica paleta de colores utilizada por el artista.",
        "La exposición presentaba piezas de diferentes épocas, permitiéndome apreciar la evolución del estilo artístico.",
        "La colección incluía obras de artistas tanto reconocidos como emergentes, ofreciendo una visión completa del panorama artístico.",
        "La forma en que la luz interactuaba con la obra creaba un efecto casi hipnótico, resaltando cada detalle.",
        "El museo estaba organizado de manera que podía seguir un recorrido cronológico a través de diferentes movimientos artísticos."
    ];

    // Descripciones turísticas
    const touristDescriptions = [
        "Este lugar es uno de los puntos emblemáticos de la ciudad, y ahora entiendo por qué atrae a tantos visitantes.",
        "La historia de este sitio se remonta a siglos atrás, y cada piedra parece contar una parte de esa historia.",
        "Los sabores locales y la gastronomía tradicional complementaron perfectamente mi visita a este lugar.",
        "Desde este punto, pude disfrutar de unas vistas panorámicas espectaculares de toda la ciudad.",
        "Los habitantes locales fueron increíblemente amables y me compartieron anécdotas fascinantes sobre este lugar."
    ];

    // Reflexiones finales
    const closings = [
        `Esta experiencia en ${cityName} quedará guardada en mi memoria como uno de los momentos destacados de mi viaje.`,
        `Sin duda, ${cityName} tiene mucho más que ofrecer, y estoy deseando seguir explorando sus rincones.`,
        `Este momento captado en ${cityName} representa perfectamente la esencia de mi viaje y mi conexión con este lugar.`,
        `Llevaré conmigo los recuerdos de ${cityName} y de esta particular experiencia durante mucho tiempo.`,
        `Esta misión completada ha enriquecido mi comprensión de la cultura y la historia de ${cityName}.`
    ];

    // Seleccionar aleatoriamente una frase de cada categoría
    const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // Construir la descripción
    let description = getRandomElement(intros) + "\n\n";
    description += `La misión "${missionTitle}" me llevó a capturar este momento único. `;
    description += getRandomElement(ambience) + "\n\n";

    // Añadir descripciones específicas según el tipo de misión
    if (isArtMission) {
        description += getRandomElement(artDescriptions) + "\n";
        description += getRandomElement(artDescriptions) + "\n\n";
    } else {
        description += getRandomElement(touristDescriptions) + "\n";
        description += getRandomElement(touristDescriptions) + "\n\n";
    }

    // Añadir más contenido para hacer la descripción más extensa
    description += "Mi recorrido por este lugar me permitió observar detalles que normalmente pasarían desapercibidos. ";
    description += "La interacción con el entorno y las personas locales me ayudó a entender mejor la cultura y tradiciones. ";
    description += `${cityName} tiene un carácter único que se refleja en su arquitectura, gastronomía y en la actitud de sus habitantes.\n\n`;

    // Añadir más detalles según el tipo de misión
    if (isArtMission) {
        description += "El arte tiene el poder de transcender barreras culturales y temporales, permitiéndonos conectar con las perspectivas y emociones de personas de diferentes épocas y lugares. ";
        description += "Observar detenidamente cada obra me ha permitido apreciar los detalles técnicos, las influencias y el contexto histórico que las rodea. ";
        description += "El contraste entre diferentes estilos y períodos artísticos enriquece nuestra comprensión de la evolución del arte a lo largo del tiempo.\n\n";
    } else {
        description += "Viajar no solo implica visitar lugares nuevos, sino también experimentar diferentes formas de vida y perspectivas. ";
        description += "Cada ciudad tiene su propio ritmo y carácter, reflejado en su arquitectura, en sus espacios públicos y en cómo interactúan sus habitantes. ";
        description += "Explorar lugares fuera de las rutas turísticas tradicionales me ha permitido descubrir gemas ocultas y vivir experiencias más auténticas.\n\n";
    }

    // Cierre
    description += getRandomElement(closings) + "\n\n";
    description += "Al revisar esta fotografía en el futuro, recordaré no solo el lugar, sino también las sensaciones, los sonidos y las personas que formaron parte de esta experiencia única.";

    return description;
}; 