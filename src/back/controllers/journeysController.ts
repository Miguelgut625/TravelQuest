import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';

// Obtener todos los viajes
const getJourneys = async (request: Request, response: Response) => {
  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*');

    if (error) throw error;

    response.status(200).json(data);
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
};

// Obtener un viaje por ID
const getJourneyById = async (request: Request, response: Response) => {
  const { id } = request.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    response.status(200).json(data);
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
};

interface JourneyRequest {
  name: string;
  description: string;
}

// Crear un nuevo viaje
const createJourney = async (request: Request, response: Response) => {
  const { name, description } = request.body as JourneyRequest;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .insert([{ name, description }]);

    if (error) throw error;

    response.status(201).json(data);
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
}; 

// Actualizar un viaje
const updateJourney = async (request: Request, response: Response) => {
  const { id } = request.params;
  const { name, description } = request.body as JourneyRequest;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    response.status(200).json(data);
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
};

// Eliminar un viaje
const deleteJourney = async (request: Request, response: Response) => {
  const { id } = request.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id);

    if (error) throw error;

    response.status(204).send(); // No content
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
};

const getJourneysByUserId = async (request: Request, response: Response) => {
  const { id } = request.params;

  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('userId', id);

    if (error) throw error;

    response.status(200).json(data);
  } catch (error: any) {
    response.status(400).json({ error: error.message });
  }
};

export { getJourneys, getJourneyById, createJourney, updateJourney, deleteJourney, getJourneysByUserId };
