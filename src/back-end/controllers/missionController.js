const { supabase } = require('../../services/supabase.server.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateMissionHint } = require('../../services/aiService.js');

// Inicializar el modelo de IA con la clave de API desde las variables de entorno
console.log('Inicializando Google AI con API key:', process.env.GOOGLE_API_KEY ? 'API key presente' : 'API key no encontrada');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Obtener misiones por ciudad y duración
const getMissionsByCityAndDuration = async (req, res) => {
  const { city, duration } = req.query;
  
  if (!city || !duration) {
    return res.status(400).json({ error: 'Se requieren los parámetros city y duration' });
  }
  
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('city', city)
      .eq('duration', duration);

    if (error) throw error;
    
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al obtener misiones:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener pista de una misión
const getMissionHint = async (req, res) => {
  const { userId, missionId } = req.params;
  
  console.log('🔍 Solicitud de pista recibida:', { userId, missionId });
  
  if (!userId || !missionId) {
    console.log('❌ Faltan parámetros:', { userId, missionId });
    return res.status(400).json({ error: 'Se requieren userId y missionId' });
  }
  
  try {
    // Verificar si el usuario tiene suficientes puntos
    console.log('👤 Verificando usuario:', userId);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error al buscar usuario:', userError);
      throw userError;
    }
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario encontrado con puntos:', user.points);

    const HINT_COST = 15;
    if (user.points < HINT_COST) {
      console.log('❌ Puntos insuficientes:', { puntos: user.points, costo: HINT_COST });
      return res.status(400).json({ error: 'No tienes suficientes puntos para obtener una pista' });
    }

    // Obtener la misión desde journeys_missions y challenges
    console.log('🎯 Buscando misión:', missionId);
    const { data: journeyMission, error: journeyError } = await supabase
      .from('journeys_missions')
      .select(`
        id,
        challenge:challenges (
          id,
          title,
          description,
          cityId
        )
      `)
      .eq('id', missionId)
      .single();

    if (journeyError) {
      console.error('❌ Error al buscar misión:', journeyError);
      throw journeyError;
    }
    
    if (!journeyMission || !journeyMission.challenge) {
      console.log('❌ Misión no encontrada:', { missionId, journeyMission });
      return res.status(404).json({ error: 'Misión no encontrada' });
    }

    console.log('✅ Misión encontrada:', { 
      id: journeyMission.id, 
      titulo: journeyMission.challenge.title 
    });

    // Generar pista usando el servicio de IA
    console.log('🤖 Generando pista con IA...');
    const hint = await generateMissionHint(
      journeyMission.challenge.description,
      journeyMission.challenge.title,
      journeyMission.challenge.cityId // o null si no está disponible
    );
    console.log('✅ Pista generada:', hint.substring(0, 50) + '...');

    // Actualizar puntos del usuario
    console.log('💰 Actualizando puntos del usuario...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ points: user.points - HINT_COST })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error al actualizar puntos:', updateError);
      throw updateError;
    }

    console.log('✅ Puntos actualizados exitosamente');
    res.status(200).json({ 
      hint,
      missionId: missionId
    });
  } catch (error) {
    console.error('❌ Error al obtener pista:', error);
    res.status(400).json({ error: error.message });
  }
};

// Generar misiones
const generateMission = async (req, res) => {
  try {
    const {
      cityName: rawCityName,
      duration,
      missionCount = 5,
      userId,
      startDate,
      endDate,
      tags = [],
      useLogicalOrder = false
    } = req.body;

    // Limpiar el nombre de la ciudad
    const cityName = rawCityName.trim();

    console.log('Iniciando generación de misiones con:', {
      cityName,
      duration,
      missionCount,
      userId,
      startDate,
      endDate,
      tags,
      useLogicalOrder
    });

    // Validar parámetros requeridos
    if (!cityName || !duration || !userId) {
      console.log('Faltan parámetros requeridos:', { cityName, duration, userId });
      return res.status(400).json({
        error: 'Faltan parámetros requeridos: cityName, duration, userId'
      });
    }

    // Validar fechas
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log('Fechas inválidas:', { startDate, endDate });
        return res.status(400).json({
          error: 'Formato de fecha inválido'
        });
      }

      if (start > end) {
        console.log('Fecha de inicio posterior a fecha de fin:', { start, end });
        return res.status(400).json({
          error: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
      }
    }

    // Verificar que el usuario existe
    console.log('Verificando usuario:', userId);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error al buscar usuario:', userError);
      return res.status(500).json({ error: 'Error al verificar usuario' });
    }

    if (!user) {
      console.log('Usuario no encontrado:', userId);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que la ciudad existe
    console.log('Buscando ciudad:', cityName);
    let cityData;
    const { data: existingCity, error: cityError } = await supabase
      .from('cities')
      .select('id, name')
      .ilike('name', cityName)
      .single();

    if (cityError) {
      console.error('Error al buscar ciudad:', cityError);
      
      // Si la ciudad no existe, intentar crearla
      console.log('Intentando crear nueva ciudad:', cityName);
      const { data: newCity, error: createCityError } = await supabase
        .from('cities')
        .insert([{ name: cityName }])
        .select()
        .single();

      if (createCityError) {
        console.error('Error al crear ciudad:', createCityError);
        return res.status(500).json({ error: 'Error al crear la ciudad' });
      }

      console.log('Ciudad creada exitosamente:', newCity);
      cityData = newCity;
    } else {
      cityData = existingCity;
    }
    
    if (!cityData) {
      console.log('Ciudad no encontrada ni creada:', cityName);
      return res.status(404).json({ error: 'Ciudad no encontrada' });
    }

    console.log('Ciudad encontrada/creada:', cityData);

    // Generar misiones usando IA
    console.log('Inicializando modelo de IA...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Genera ${missionCount} misiones para la ciudad de ${cityName} con una duración de ${duration} días. 
    Las misiones deben ser divertidas, desafiantes y culturalmente relevantes.
    ${tags.length > 0 ? `Incluye las siguientes temáticas: ${tags.join(', ')}` : ''}
    ${useLogicalOrder ? 'Las misiones deben seguir un orden lógico considerando la ubicación y el tiempo.' : ''}
    
Devuelve un objeto JSON con la siguiente estructura exacta:
{
  "misiones": [
    {
      "Título": "Título de la misión",
      "Descripción": "Descripción muy detallada y muy descriptiva de la misión incluyendo qué foto tomar y recomendaciones de que hacer por la zona, pide solo una foto y que sea relativamente facil de conseguir es decir no pidas una fota en una hora del dia o no pidas una foto de un sitio que es iliegal la entrada, intenta no repetir las mismas misiones",
      "Dificultad": "Fácil|Media|Difícil",
      "Puntos": 25|50|100
    }
  ]
}
Los puntos deben ser: 25 para Fácil, 50 para Media, 100 para Difícil. No incluyas explicaciones adicionales, solo el JSON.`;

    console.log('Generando misiones con IA...');
    console.log('Prompt:', prompt);
    
    try {
      const response = await model.generateContent(prompt);
      console.log('Respuesta de IA recibida');
      const missionsData = response.response.text();
      
      // Extraer el JSON de la respuesta
      const jsonMatch = missionsData.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró un objeto JSON válido en la respuesta');
      }

      const missions = JSON.parse(jsonMatch[0]);

      if (!missions.misiones || !Array.isArray(missions.misiones)) {
        throw new Error('La respuesta no contiene un array de misiones válido');
      }

      // Insertar misiones en la base de datos
      const challengesToInsert = missions.misiones.map(mission => ({
        title: mission.Título,
        description: mission.Descripción,
        difficulty: mission.Dificultad,
        points: mission.Puntos,
        cityId: cityData.id
      }));

      console.log('Insertando desafíos en la base de datos...');
      const { data: insertedChallenges, error: insertError } = await supabase
        .from('challenges')
        .insert(challengesToInsert)
        .select();

      if (insertError) {
        console.error('Error al insertar desafíos:', insertError);
        return res.status(500).json({ error: 'Error al guardar las misiones' });
      }

      // Crear un nuevo viaje
      console.log('Creando nuevo viaje...');
      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .insert([{
          userId: userId,
          cityId: cityData.id,
          description: `Viaje a ${cityName} por ${duration} días`,
          created_at: new Date().toISOString(),
          start_date: startDate,
          end_date: endDate
        }])
        .select()
        .single();

      if (journeyError) {
        console.error('Error al crear viaje:', journeyError);
        return res.status(500).json({ error: 'Error al crear el viaje' });
      }

      // Vincular misiones al viaje
      console.log('Vinculando misiones al viaje...');
      const journeyMissions = insertedChallenges.map((mission, index) => ({
        journeyId: journey.id,
        challengeId: mission.id,
        completed: false,
        created_at: new Date().toISOString(),
        start_date: startDate,
        end_date: endDate,
        route_id: useLogicalOrder ? null : null, // Se actualizará después de crear la ruta
        order_index: useLogicalOrder ? index + 1 : null
      }));

      const { error: linkError } = await supabase
        .from('journeys_missions')
        .insert(journeyMissions);

      if (linkError) {
        console.error('Error al vincular misiones:', linkError);
        return res.status(500).json({ error: 'Error al vincular las misiones al viaje' });
      }

      console.log('Proceso completado exitosamente');
      res.status(201).json({
        journeyId: journey.id,
        challenges: insertedChallenges
      });
    } catch (aiError) {
      console.error('Error en la generación de IA:', aiError);
      return res.status(500).json({ error: 'Error al generar misiones con IA' });
    }
  } catch (error) {
    console.error('Error en generateMission:', error);
    res.status(500).json({ error: 'Error al generar misiones' });
  }
};

// Obtener misiones de evento
const getEventMissions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_event', true);

    if (error) throw error;

    // Obtener nombres de ciudades para las misiones de evento
    const cityIds = [...new Set((data || []).filter(m => m.cityId).map(m => m.cityId))];
    let cityMap = {};
    
    if (cityIds.length > 0) {
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds);

      if (citiesError) throw citiesError;

      cityMap = (citiesData || []).reduce((acc, city) => {
        acc[city.id] = city.name;
        return acc;
      }, {});
    }

    res.status(200).json({
      missions: data,
      cities: cityMap
    });
  } catch (error) {
    console.error('Error al obtener misiones de evento:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener misiones de evento de un usuario
const getUserEventMissions = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('id, cityId, journeys_missions (challengeId)')
      .eq('userId', userId);

    if (error) throw error;

    // Mapear: { [challengeId]: journeyId }
    const accepted = {};
    data.forEach(journey => {
      (journey.journeys_missions || []).forEach(jm => {
        accepted[jm.challengeId] = journey.id;
      });
    });

    res.status(200).json(accepted);
  } catch (error) {
    console.error('Error al obtener misiones de evento del usuario:', error);
    res.status(400).json({ error: error.message });
  }
};

// Aceptar misión de evento
const acceptEventMission = async (req, res) => {
  const { userId, missionId } = req.params;
  const { cityId } = req.body;

  try {
    if (!cityId) {
      return res.status(400).json({ error: 'La misión de evento no tiene una ciudad asociada' });
    }

    // Buscar journey existente para la ciudad
    let journeyId = null;
    const { data: journeys, error: journeyError } = await supabase
      .from('journeys')
      .select('id')
      .eq('userId', userId)
      .eq('cityId', cityId);

    if (journeyError) throw journeyError;

    if (journeys && journeys.length > 0) {
      journeyId = journeys[0].id;
    } else {
      // Crear un nuevo journey para la ciudad
      const { data: newJourney, error: newJourneyError } = await supabase
        .from('journeys')
        .insert({
          userId: userId,
          cityId: cityId,
          description: `Viaje a evento`,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (newJourneyError) throw newJourneyError;
      journeyId = newJourney.id;
    }

    // Insertar la misión de evento en journeys_missions
    const { error: insertError } = await supabase
      .from('journeys_missions')
      .insert({
        journeyId: journeyId,
        challengeId: missionId,
        completed: false,
        created_at: new Date().toISOString(),
        start_date: req.body.start_date || null,
        end_date: req.body.end_date || null,
      });

    if (insertError) throw insertError;

    res.status(200).json({ 
      message: 'Misión de evento aceptada exitosamente',
      journeyId 
    });
  } catch (error) {
    console.error('Error al aceptar misión de evento:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getMissionsByCityAndDuration,
  getMissionHint,
  generateMission,
  getEventMissions,
  getUserEventMissions,
  acceptEventMission
}; 