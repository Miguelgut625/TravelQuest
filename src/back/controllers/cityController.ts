import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';

// Obtener todas las ciudades
const getCities = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener una ciudad por ID
const getCityById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

interface CityRequest {
  name: string;
  description: string;
}

// Crear una nueva ciudad
const createCity = async (req: Request, res: Response) => {
  const { name, description } = req.body as CityRequest;

  try {
    const { data, error } = await supabase
      .from('cities')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar una ciudad
const updateCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body as CityRequest;

  try {
    const { data, error } = await supabase
      .from('cities')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar una ciudad
const deleteCity = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export { getCities, getCityById, createCity, updateCity, deleteCity };