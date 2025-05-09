/**
 * Servicio para análisis de imágenes y generación de descripciones utilizando IA
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import axios from 'axios';

// Obtener la API key desde las variables de entorno
const API_KEY = Constants.expoConfig?.extra?.googleAiApiKey || '';

// Verificar y registrar estado de la API key
console.log(`Estado de API key de Google AI: ${API_KEY ? 'Configurada (' + API_KEY.substring(0, 5) + '...)' : 'No configurada'}`);

// Comprobar si la API key es válida y registrar información de depuración
if (API_KEY) {
  console.log('Expo Config extra:', JSON.stringify(Constants.expoConfig?.extra || {}));
  if (API_KEY.length < 10) {
    console.warn('La API key parece demasiado corta, puede ser inválida');
  }
}

// Inicializar la API de Google Generative AI solo si hay una API key válida
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

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

  tourist: `Analiza esta fotografía de un destino o atracción turística en detalle y crea una descripción estilo 'experiencia personal de viaje'.

Adopta un estilo de primera persona, como si fueras el viajero que ha visitado este lugar y estás escribiendo en tu diario de viaje. Incluye:

1. IDENTIFICACIÓN DEL LUGAR:
   - Identifica el lugar exacto: monumento, paisaje, ciudad, etc.
   - Si reconoces un lugar famoso (como la Torre Eiffel, Machu Picchu), menciona su nombre completo
   - Incluye la ubicación geográfica (ciudad, país)

2. DESCRIPCIÓN ATMOSFÉRICA Y VISUAL:
   - Describe el ambiente, la luz, los colores y sensaciones
   - Menciona detalles arquitectónicos, elementos naturales o culturales destacados
   - Incluye observaciones sobre las personas, actividades o el entorno

3. CONTEXTO HISTÓRICO Y CULTURAL:
   - Menciona brevemente datos históricos relevantes
   - Describe la importancia cultural o significado del lugar
   - Incluye alguna curiosidad o dato interesante

4. EXPERIENCIA PERSONAL:
   - Expresa emociones o impresiones como viajero (asombro, paz, admiración)
   - Menciona lo que hiciste allí o lo que has aprendido
   - Incluye reflexiones o pensamientos inspirados por el lugar

5. CONCLUSIÓN: 
   - Cierra con una reflexión final o impresión duradera
   - Enfatiza el valor del lugar como destino y su impacto en ti

Escribe en estilo narrativo, personal y evocador, como una entrada detallada de diario de viaje de aproximadamente 50 líneas. Usa un tono contemplativo, reflexivo y apreciativo.`
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

    // Si no hay API key configurada o genAI no está inicializado
    if (!API_KEY || !genAI) {
      console.warn('❌ API key de Google AI no configurada o inválida');
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