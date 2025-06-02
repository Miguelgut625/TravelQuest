const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Usar la misma API key que se usa en missionGenerator.ts
const API_KEY = "AIzaSyB4PuDOYXgbH9egme1UCO0CiRcOV4kVfMM";

// Inicializar la API de Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Genera una pista para una misión
 * @param {string} missionDescription - Descripción de la misión
 * @param {string} missionTitle - Título de la misión
 * @param {string} [cityName] - Nombre de la ciudad (opcional)
 * @returns {Promise<string>} La pista generada
 */
const generateMissionHint = async (missionDescription, missionTitle, cityName) => {
  try {
    console.log('Generando pista para misión:', { missionTitle, cityName });
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
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

    
    const result = await model.generateContent(prompt);
    const hint = result.response.text();
    
    console.log('Pista generada exitosamente');
    return hint;
  } catch (error) {
    console.error('Error generando pista:', error);
    return generateFallbackHint(missionDescription, cityName);
  }
};

/**
 * Genera una pista de respaldo en caso de error
 * @param {string} missionDescription - Descripción de la misión
 * @param {string} [cityName] - Nombre de la ciudad (opcional)
 * @returns {string} Pista de respaldo
 */
const generateFallbackHint = (missionDescription, cityName) => {
  const hints = [
    `Busca en ${cityName || 'la ciudad'} un lugar que se relacione con "${missionDescription.substring(0, 50)}..."`,
    `Explora ${cityName || 'la zona'} buscando pistas sobre "${missionDescription.substring(0, 50)}..."`,
    `Presta atención a los detalles que te rodean en ${cityName || 'este lugar'} relacionados con "${missionDescription.substring(0, 50)}..."`
  ];
  
  return hints[Math.floor(Math.random() * hints.length)];
};

module.exports = {
  generateMissionHint
}; 