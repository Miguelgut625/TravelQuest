import { supabase } from './supabase';

const generateMission = async (city: string, duration: number, missionCount: number) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`, 
       },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Genera ${missionCount} misiones en ${city} que se puedan completar en ${duration} días. Cada misión debe tener un título, una descripción, una dificultad (Fácil, Media o Difícil) y puntos (25 para Fácil, 50 para Media, 100 para Difícil).`
          }
        ],
      }),
    });

    const data = await response.json();
    console.log('Respuesta de la API:', data);

    if (response.status !== 200) {
      throw new Error(data.error.message || 'Error al generar misiones');
    }

    const missions = data.choices.map((choice: any) => {
      const { title, description, difficulty } = choice.message.content; // Ajusta según la respuesta de la API

      // Determinar los puntos basados en la dificultad
      const points = difficulty === 'Fácil' ? 25 : difficulty === 'Media' ? 50 : 100;

      return {
        title,
        description,
        city,
        duration,
        difficulty,
        points,
        completed: false,
      };
    });

    // Guardar las misiones en Supabase
    const { error } = await supabase
      .from('missions')
      .insert(missions);

    if (error) {
      console.error('Error saving missions:', error);
    } else {
      console.log('Misiones guardadas exitosamente');
    }
  } catch (error) {
    console.error('Error generating missions:', error);
  }
};

export default generateMission;
