/**
 * Servicio para análisis de imágenes y generación de descripciones utilizando IA
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import axios from 'axios';
import { supabase } from './supabase';

// Usar la misma API key que se usa en missionGenerator.ts
const API_KEY = "AIzaSyB4PuDOYXgbH9egme1UCO0CiRcOV4kVfMM";

// Verificar y registrar estado de la API key
console.log(`Estado de API key de Google AI: ${API_KEY ? 'Configurada (' + API_KEY.substring(0, 5) + '...)' : 'No configurada'}`);

// Comprobar si la API key es válida y registrar información de depuración
if (API_KEY) {
  console.log('Expo Config extra:', JSON.stringify(Constants.expoConfig?.extra || {}));
  if (API_KEY.length < 10) {
    console.warn('La API key parece demasiado corta, puede ser inválida');
  }
}

// Inicializar la API de Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

// Prompts mejorados para diferentes tipos de análisis
const analysisByType = {
  standard: `Analiza esta fotografía detalladamente y describe objetivamente lo que ves.

Esta es una FOTOGRAFÍA REAL que puede ser de cualquier lugar, escena o tema del mundo.

Describe exactamente:

1. CONTENIDO PRINCIPAL:
   - ¿Qué tipo de lugar, obra, escena o sujeto muestra principalmente esta imagen?
   - Identifica con precisión si es una obra de arte, un monumento, un paisaje natural, interior, etc.
   - Si reconoces un lugar o elemento específico y famoso, nómbralo con exactitud.

2. ELEMENTOS VISIBLES EN DETALLE:
   - Describe los componentes principales de la imagen (arquitectura, arte, personas, naturaleza)
   - Analiza el estilo, materiales, características y contexto visual
   - Menciona los colores, texturas y composición de la escena

3. CONTEXTO Y AMBIENTE:
   - Periodo histórico o época que representa (si es identificable)
   - Significado cultural o importancia del contenido (si lo reconoces)
   - Características únicas o distintivas

IMPORTANTE: 
- Analiza esta fotografía de forma totalmente objetiva, sin ningún sesgo previo
- Identifica exactamente lo que muestra, sea lo que sea
- No asumas que es un lugar o escena específica si no lo reconoces claramente
- Proporciona el nombre exacto y preciso si reconoces inequívocamente un lugar famoso

Ofrece una descripción precisa y objetiva de esta fotografía, sea cual sea su contenido.`,

  art: `Analiza esta imagen y determina si es una obra de arte reconocida. La imagen podría ser:

- Un fresco religioso como "La Creación de Adán" en la Capilla Sixtina
- Una pintura renacentista famosa u obra clásica 
- Arte religioso o histórico
- Un monumento o lugar histórico
- Otra obra artística o imagen de la vida cotidiana

1. IDENTIFICACIÓN DE LA OBRA:
   - IMPORTANTE: Si reconoces una obra famosa (como "La Creación de Adán" de Miguel Ángel), AFIRMA CLARAMENTE que es esa obra específica
   - Menciona el nombre exacto, autor y ubicación si puedes identificarla con certeza
   - No digas "no se corresponde con..." si realmente se trata de una obra famosa
   - Si parece una obra famosa pero tienes dudas, di "parece ser..."

2. ANÁLISIS DEL CONTENIDO:
   - Describe las figuras, escenas y elementos principales
   - Identifica el tema: religioso, mitológico, histórico, etc.
   - Si hay personajes reconocibles (Dios, Adán, santos, figuras históricas), nómbralos
   - Describe la composición, estructura y elementos destacados

3. CONTEXTO HISTÓRICO:
   - Periodo artístico: Renacimiento, Barroco, etc.
   - Contexto histórico y cultural de la obra
   - Importancia y relevancia del arte mostrado

SECCIÓN FINAL: Concluye con una determinación clara:
- Si reconoces la imagen como una obra famosa, afirma: "Esta imagen muestra [NOMBRE DE LA OBRA] de [AUTOR], ubicada en [LUGAR]".
- Para "La Creación de Adán", afirma: "Esta imagen muestra 'La Creación de Adán', el famoso fresco pintado por Miguel Ángel en el techo de la Capilla Sixtina (1512)".

Incluso si solo se muestra una parte o sección de una obra famosa, identifícala correctamente.`,

  tourist: `Analiza esta fotografía de un destino o atracción turística en detalle y crea una descripción informativa en estilo de guía turístico profesional.

Utiliza TERCERA PERSONA, con un tono educativo y descriptivo. NO uses primera persona ("yo", "mi", etc.). Incluye:

1. IDENTIFICACIÓN DEL LUGAR:
   - Identifica el lugar con precisión: monumento, paisaje, ciudad, etc.
   - Si es un lugar famoso (como la Torre Eiffel, Machu Picchu), menciona su nombre completo
   - Incluye la ubicación geográfica (ciudad, país)

2. DESCRIPCIÓN ARQUITECTÓNICA O PAISAJÍSTICA:
   - Describe elementos visuales clave, estilos arquitectónicos, materiales
   - Para monumentos: año de construcción, arquitecto si es conocido
   - Para paisajes: formaciones geológicas, flora y fauna destacada

3. CONTEXTO HISTÓRICO Y CULTURAL:
   - Proporciona 2-3 datos históricos relevantes del lugar
   - Explica la importancia cultural o el significado histórico
   - Menciona 1-2 curiosidades interesantes que un guía compartiría

4. INFORMACIÓN PRÁCTICA:
   - Describe brevemente lo que los visitantes pueden experimentar en el lugar
   - Menciona aspectos destacados que los turistas no deberían perderse
   - Cualquier detalle relevante sobre horarios o mejores momentos para visitar (si es visible)

5. CONCLUSIÓN: 
   - Resume la importancia del lugar en el contexto del patrimonio local o mundial

Escribe en estilo informativo, claro y educativo, como lo haría un guía turístico experimentado explicando el lugar a un grupo. El texto debe ser objetivo, preciso y en TERCERA PERSONA, sin opiniones personales en primera persona.`
};

/**
 * Determina si una URL es de Cloudinary
 * @param url URL a verificar
 * @returns true si es una URL de Cloudinary
 */
const isCloudinaryUrl = (url: string): boolean => {
  return url && typeof url === 'string' && url.includes('cloudinary.com');
};

/**
 * Convierte una imagen en formato correcto para la API de Google
 * @param imageUrl URL de la imagen a procesar
 * @returns Objeto preparado para la API
 */
const prepareImageForAPI = async (imageUrl: string): Promise<{
  success: boolean;
  data?: { mimeType: string; data: string } | { uri: string };
  error?: string;
}> => {
  try {
    // Si es una URL de Cloudinary, intentar usarla directamente
    if (isCloudinaryUrl(imageUrl)) {
      // Verificar que la URL es accesible
      try {
        const response = await axios.head(imageUrl, { timeout: 5000 });
        if (response.status === 200) {
          console.log('✅ URL de Cloudinary verificada, usando directamente');
          return {
            success: true,
            data: { uri: imageUrl }
          };
        }
      } catch (headError) {
        console.warn('⚠️ Error verificando URL de Cloudinary:', headError);
        // Continuar con el método de base64 como fallback
      }
    }

    // Método tradicional: convertir a base64
    const imageBase64 = await getImageBase64(imageUrl);
    if (!imageBase64) {
      return {
        success: false,
        error: 'No se pudo convertir la imagen a base64'
      };
    }
    
    // Extraer la parte de datos para validación adicional
    const parts = imageBase64.split(',');
    if (parts.length !== 2) {
      return {
        success: false,
        error: 'Formato de datos base64 inválido'
      };
    }

    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = parts[1];
    
    if (!base64Data || base64Data.length < 50) {
      return {
        success: false,
        error: 'Datos base64 inválidos o demasiado cortos'
      };
    }
    
    return {
      success: true,
      data: {
        mimeType,
        data: base64Data
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Error preparando imagen: ${error.message || error}`
    };
  }
};

/**
 * Limpia y sanitiza la URL de la imagen para asegurar un formato adecuado para base64
 * @param imageUrl URL de la imagen a limpiar
 * @returns URL limpia
 */
const sanitizeImageUrl = (imageUrl: string): string => {
  try {
    // Si la URL ya es un blob o data URI, devolverla limpia
    if (imageUrl.startsWith('data:image/')) {
      // Verificar que el formato base64 sea correcto
      const base64Content = imageUrl.split(',')[1];
      if (!base64Content || base64Content.length < 10) {
        console.warn('⚠️ URL base64 inválida o demasiado corta');
        return '';
      }
      return imageUrl;
    }

    // Si es una URL web normal, verificar que sea una URL válida
    if (imageUrl.startsWith('http')) {
      try {
        new URL(imageUrl);
        return imageUrl;
      } catch (e) {
        console.warn('⚠️ URL de imagen inválida:', e);
        return '';
      }
    }

    // Si es una URL de archivo local, verificar que tenga formato adecuado
    if (imageUrl.startsWith('file://')) {
      return imageUrl;
    }

    console.warn('⚠️ Formato de URL de imagen no reconocido:', imageUrl.substring(0, 20) + '...');
    return '';
  } catch (error) {
    console.error('❌ Error sanitizando URL de imagen:', error);
    return '';
  }
};

/**
 * Convierte una imagen en base64 para enviarla a la API
 * @param imageUrl URL de la imagen a procesar
 * @returns Imagen en formato base64 o null si hay error
 */
const getImageBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const sanitizedUrl = sanitizeImageUrl(imageUrl);
    if (!sanitizedUrl) {
      throw new Error('URL de imagen inválida después de sanitizar');
    }
    
    // Si la imagen ya está en formato base64, verificar y retornar
    if (sanitizedUrl.startsWith('data:image/')) {
      // Verificar que el formato base64 sea válido
      try {
        const base64Content = sanitizedUrl.split(',')[1];
        // Intentar decodificar para verificar validez
        if (typeof atob === 'function') {
          const testDecode = atob(base64Content.substring(0, 10));
        }
        return sanitizedUrl;
      } catch (e) {
        console.error('❌ Error validando base64:', e);
        return null;
      }
    }

    // Obtener la imagen como blob con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(sanitizedUrl, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error obteniendo imagen: ${response.status} ${response.statusText}`);
      }
      
    const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Blob de imagen vacío');
      }
    
    // Convertir blob a base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          try {
        const base64 = reader.result as string;
            
            // Verificar que el resultado sea válido
            if (!base64 || typeof base64 !== 'string' || base64.length < 100) {
              reject(new Error('Resultado base64 inválido o demasiado corto'));
              return;
            }
            
            // Verificar que el formato sea correcto
            if (!base64.startsWith('data:image/')) {
              reject(new Error('Formato base64 no es una imagen válida'));
              return;
            }
            
        resolve(base64);
          } catch (e) {
            reject(e);
          }
      };
        reader.onerror = (e) => {
          reject(new Error(`Error leyendo blob: ${e}`));
        };
      reader.readAsDataURL(blob);
    });
    } catch (fetchError) {
      if (timeoutId) clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Error convirtiendo imagen a base64:', error);
    return null;
  }
};

/**
 * Analiza una imagen utilizando la API de Google Generative AI y devuelve una descripción detallada
 * @param imageUrl URL de la imagen a analizar
 * @param cityName Nombre de la ciudad donde se tomó la imagen (opcional)
 * @param missionType Tipo de misión (opcional)
 * @param customPrompt Prompt personalizado para la generación (opcional)
 * @returns Descripción detallada de la imagen
 */
export const analyzeImage = async (
  imageUrl: string,
  cityName?: string,
  missionType: 'standard' | 'art' | 'tourist' = 'tourist',
  customPrompt?: string
): Promise<string> => {
  try {
    console.log(`🔍 Iniciando análisis de imagen para ${cityName || 'lugar desconocido'} con tipo ${missionType}`);
    console.log(`🖼️ URL de la imagen: ${imageUrl?.substring(0, 30)}...`);
    
    // Verificación inicial de parámetros
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ URL de imagen inválida:', imageUrl);
      return generateFallbackResponse(cityName, missionType);
    }

    // Implementar un timeout más largo para dar más tiempo a la API
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado al analizar la imagen'));
      }, 30000); // 30 segundos
    });
    
    const analyzePromise = async (): Promise<string> => {
      try {
        // Preparar imagen para la API (base64 o URL directa)
        const imageData = await prepareImageForAPI(imageUrl);
        if (!imageData.success || !imageData.data) {
          console.error('❌ Error preparando imagen:', imageData.error);
          return generateFallbackResponse(cityName, missionType);
        }
        
        // Configurar el modelo con retry y con parámetros más seguros
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.6,  // Reducir ligeramente para mayor determinismo
            maxOutputTokens: 350,
          }
        });
        
        // Preparar el prompt
        const prompt = customPrompt || analysisByType[missionType] || analysisByType.standard;
        
        // Intentar la generación con retry y manejo de errores mejorado
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;
        
        while (attempts < maxAttempts) {
          try {
            console.log(`🔄 Intento ${attempts + 1} de ${maxAttempts} de generación`);
            
            let result;
            
            // Usando la imagen preparada correctamente (URL o base64)
            if ('uri' in imageData.data) {
              // Usar URL directa
              console.log('🌐 Usando URL directa para Gemini');
              
              // Intentar descargar la imagen y pasarla como base64
              try {
                const response = await fetch(imageData.data.uri);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                });
                reader.readAsDataURL(blob);
                const base64Data = await base64Promise;
                
                // Extraer los datos y tipo MIME
                const parts = base64Data.split(',');
                const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                const data = parts[1];
                
                console.log('✅ Imagen de Cloudinary convertida a base64 correctamente');
                result = await model.generateContent([
          prompt,
                  { inlineData: { data, mimeType } }
                ]);
              } catch (urlError) {
                console.warn('⚠️ Error procesando URL, intentando pasar URL directamente:', urlError);
                
                // Como último recurso, intentar pasar la URL completa
                result = await model.generateContent([
                  prompt,
                  imageData.data.uri
                ]);
              }
            } else {
              // Usar base64
              console.log('📊 Usando datos base64 para Gemini');
              result = await model.generateContent([
                prompt,
                { inlineData: { 
                  data: imageData.data.data, 
                  mimeType: imageData.data.mimeType 
                }}
              ]);
            }
            
        const response = await result.response;
        const text = response.text();
        
            if (text && text.trim() !== '') {
              console.log('✅ Generación exitosa en el intento', attempts + 1);
              return text;
            }
            
            throw new Error('Respuesta vacía de la API');
          } catch (retryError) {
            lastError = retryError;
            console.warn(`⚠️ Error en intento ${attempts + 1}:`, retryError.message || retryError);
            attempts++;
            
            if (attempts === maxAttempts) {
              console.error('❌ Se agotaron los intentos de generación');
              break;
        }
        
            // Esperar antes de reintentar con backoff exponencial
            const backoffTime = Math.min(2000 * Math.pow(2, attempts), 10000);
            console.log(`⏱️ Esperando ${backoffTime}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
        
        console.error('❌ Todos los intentos de generación fallaron. Último error:', lastError);
        return generateFallbackResponse(cityName, missionType);
      } catch (error) {
        console.error('❌ Error en el análisis de imagen:', error);
        return generateFallbackResponse(cityName, missionType);
      }
    };
    
    // Race entre la promesa de análisis y el timeout, con manejo de errores
    return await Promise.race([analyzePromise(), timeoutPromise])
      .catch(error => {
        console.error('❌ Error en Promise.race:', error.message || error);
        return generateFallbackResponse(cityName, missionType);
      });
      
  } catch (error) {
    console.error('❌ Error general en analyzeImage:', error);
    return generateFallbackResponse(cityName, missionType);
  }
};

// Función auxiliar para generar respuestas de fallback
const generateFallbackResponse = (cityName?: string, missionType: string = 'tourist'): string => {
  const responses = {
    art: [
      `He visitado una impresionante obra de arte en ${cityName || 'este lugar'}. La experiencia fue verdaderamente inspiradora.`,
      `El arte que encontré en ${cityName || 'mi viaje'} me dejó una profunda impresión.`,
      `Esta pieza artística en ${cityName || 'este destino'} refleja la rica cultura del lugar.`
    ],
    tourist: [
      `Mi visita a ${cityName || 'este lugar'} ha sido una experiencia inolvidable.`,
      `He capturado un momento especial durante mi exploración de ${cityName || 'este destino'}.`,
      `Descubriendo los encantos de ${cityName || 'este lugar'} en mi viaje.`
    ],
    standard: [
      `He completado esta misión en ${cityName || 'mi viaje'} con éxito.`,
      `Una nueva experiencia añadida a mi diario en ${cityName || 'este destino'}.`,
      `Momento memorable capturado en ${cityName || 'este lugar'}.`
    ]
  };

  const typeResponses = responses[missionType as keyof typeof responses] || responses.standard;
  return typeResponses[Math.floor(Math.random() * typeResponses.length)];
};

/**
 * Actualiza una entrada del diario con la descripción generada por IA
 * @param missionId ID de la misión
 * @param userId ID del usuario
 * @param aiDescription Descripción generada por IA
 * @returns Resultado de la operación
 */
export const updateJournalWithAIDescription = async (
  missionId: string,
  userId: string,
  aiDescription: string
): Promise<{success: boolean; message: string}> => {
  try {
    console.log('🔄 Actualizando entrada de diario con descripción de IA');
    console.log('📝 Descripción: ', aiDescription.substring(0, 50) + '...');
    console.log('🆔 MissionID:', missionId);
    console.log('👤 UserID:', userId);
    
    if (!aiDescription || aiDescription.trim().length < 20) {
      return {
        success: false,
        message: 'La descripción es demasiado corta o está vacía'
      };
    }
    
    // Intentar actualizar usando los nombres de columna más probables
    const updateAttempts = [
      // 1. Intento: nombres en minúsculas (más común en PostgreSQL)
      {
        column: 'content',
        missionIdColumn: 'missionid',
        userIdColumn: 'userid'
      },
      // 2. Intento: nombres con underscores
      {
        column: 'content',
        missionIdColumn: 'mission_id',
        userIdColumn: 'user_id'
      },
      // 3. Intento: nombres en camelCase
      {
        column: 'content',
        missionIdColumn: 'missionId',
        userIdColumn: 'userId'
      }
    ];
    
    let isUpdated = false;
    let errorDetails = '';
    
    for (const attempt of updateAttempts) {
      try {
        console.log(`🔄 Intentando actualizar con: ${attempt.missionIdColumn}, ${attempt.userIdColumn}`);
        
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ [attempt.column]: aiDescription })
          .eq(attempt.missionIdColumn, missionId)
          .eq(attempt.userIdColumn, userId)
          .select();
        
        if (error) {
          errorDetails += `Error con ${attempt.missionIdColumn}: ${error.message}. `;
          console.warn(`⚠️ Error actualizando con ${attempt.missionIdColumn}:`, error.message);
          continue;
        }
        
        if (data && data.length > 0) {
          console.log('✅ Descripción actualizada exitosamente con formato:', attempt);
          isUpdated = true;
          break;
        } else {
          console.warn(`⚠️ No se encontraron entradas para actualizar con ${attempt.missionIdColumn}`);
        }
      } catch (e: any) {
        errorDetails += `Excepción: ${e.message || e}. `;
        console.warn('⚠️ Excepción en intento de actualización:', e);
      }
    }
    
    // Si no se actualizó con los intentos anteriores, intentar buscar por ID de entrada
    if (!isUpdated) {
      try {
        // Intentar encontrar la entrada por missionId y userId
        const { data: journalEntry } = await supabase
          .from('journal_entries')
          .select('id')
          .or(`missionid.eq.${missionId},mission_id.eq.${missionId},missionId.eq.${missionId}`)
          .or(`userid.eq.${userId},user_id.eq.${userId},userId.eq.${userId}`)
          .limit(1);
          
        if (journalEntry && journalEntry.length > 0) {
          const entryId = journalEntry[0].id;
          console.log('🔍 Entrada encontrada con ID:', entryId);
          
          // Actualizar usando el ID de la entrada
          const { error: updateError } = await supabase
            .from('journal_entries')
            .update({ content: aiDescription })
            .eq('id', entryId);
            
          if (!updateError) {
            console.log('✅ Descripción actualizada exitosamente usando ID de entrada');
            isUpdated = true;
          } else {
            errorDetails += `Error con ID: ${updateError.message}. `;
            console.warn('⚠️ Error actualizando con ID:', updateError);
          }
        } else {
          console.warn('⚠️ No se encontró la entrada usando búsqueda OR');
        }
      } catch (e: any) {
        errorDetails += `Excepción en búsqueda por ID: ${e.message || e}. `;
        console.warn('⚠️ Excepción en búsqueda por ID:', e);
      }
    }
    
    return {
      success: isUpdated,
      message: isUpdated 
        ? 'Descripción actualizada exitosamente'
        : `No se pudo actualizar la descripción: ${errorDetails}`
    };
  } catch (error: any) {
    console.error('❌ Error en updateJournalWithAIDescription:', error);
    return {
      success: false,
      message: `Error al actualizar la descripción: ${error.message || error}`
    };
  }
};

/**
 * Genera una pista para una misión basada en su descripción usando IA
 * @param missionDescription Descripción de la misión
 * @param missionTitle Título de la misión
 * @param cityName Nombre de la ciudad (opcional)
 * @returns Pista generada por IA
 */
export const generateMissionHint = async (
  missionDescription: string, 
  missionTitle: string,
  cityName?: string
): Promise<string> => {
  try {
    console.log('Generando pista para misión:', missionTitle);
    
    // Verificar la API key
    if (!API_KEY || API_KEY.length < 10) {
      console.warn('API key inválida para generación de pistas');
      return generateFallbackHint(missionDescription, cityName);
    }

    // Crear un modelo de texto con la API de Google
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construir el prompt para la generación de la pista
    const prompt = `
    Actúa como un asistente de viajes experto que proporciona pistas concretas y específicas para ayudar a completar misiones de viaje.

    Para esta misión:
    - TÍTULO: ${missionTitle}
    - DESCRIPCIÓN: ${missionDescription}
    ${cityName ? `- CIUDAD: ${cityName}` : ''}

    Genera UNA ÚNICA PISTA muy específica que ayude al usuario a completar esta misión.
    
    La pista debe:
    1. Proporcionar información CONCRETA y ÚTIL para encontrar el lugar exacto, el punto de vista óptimo para una foto, o el elemento específico que necesitan encontrar.
    2. Incluir UN detalle muy específico (ubicación exacta, obra específica, plato concreto, rincón particular, etc.) que garantice que el usuario pueda completar la misión.
    3. Ser directa y breve (máximo 3 frases).

    No uses frases genéricas como "explora" o "busca". En cambio, proporciona información precisa como:
    - "La mejor vista de la catedral está desde la plaza norte cerca de la puerta principal del castillo, especialmente al atardecer"
    - "El plato de pasta más tradicional es el 'pici', busca restaurantes en la calle principal que lo elaboren artesanalmente"
    - "El cuadro 'La Mona Lisa' es la mayor representación del arte de este museo, se encuentra en la sala 3, ala este del museo, junto a otras obras de Picasso"
    - "La planta tiene flores rojas, suele medir 20cm de alto y se encuentra principalmente en los jardines del parque central"
    
    Recuerda: tu pista debe garantizar que el usuario pueda completar la misión correctamente, siendo específica y directa.
    `;

    // Generar la respuesta
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    console.log('Pista generada con éxito');
    
    return responseText.trim();
  } catch (error) {
    console.error('Error al generar pista con IA:', error);
    return generateFallbackHint(missionDescription, cityName);
  }
};

/**
 * Genera una pista alternativa si la IA falla
 * @param missionDescription Descripción de la misión
 * @param cityName Nombre de la ciudad (opcional)
 * @returns Pista generada sin IA
 */
const generateFallbackHint = (missionDescription: string, cityName?: string): string => {
  // Generamos pistas por categorías basadas en palabras clave
  if (missionDescription.includes('foto') || missionDescription.includes('fotografía')) {
    return 'Busca un punto elevado o con buena iluminación para conseguir la mejor perspectiva. Intenta visitar el lugar al amanecer o atardecer para una iluminación óptima.';
  } 
  else if (missionDescription.includes('comida') || missionDescription.includes('gastronomía') || missionDescription.includes('restaurante')) {
    return 'Pregunta directamente a los residentes locales, no a otros turistas. Busca restaurantes con menú en el idioma local y alejados de las zonas más turísticas.';
  }
  else if (missionDescription.includes('museo') || missionDescription.includes('arte') || missionDescription.includes('pintura')) {
    return 'Revisa el mapa del museo al entrar y pregunta al personal sobre la ubicación exacta. La mayoría de obras importantes suelen estar en salas centrales o especiales.';
  }
  else if (missionDescription.includes('parque') || missionDescription.includes('naturaleza') || missionDescription.includes('jardín')) {
    return 'Consulta el mapa del parque y dirige tu atención a las zonas menos transitadas. Lo más interesante suele estar alejado de la entrada principal.';
  }
  else {
    return `Observa cuidadosamente los detalles en la descripción de la misión. Pregunta a residentes locales por información específica${cityName ? ' sobre ' + cityName : ''}.`;
  }
}; 