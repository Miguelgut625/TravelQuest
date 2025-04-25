import { Request, Response } from 'express';
import { supabase } from '../../services/supabase.server.js';

// Obtener todas las misiones
const getChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

// Obtener puntuación de la misión
const getChallengesPoints = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('points')
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

// Obtener una misión por ID
const getChallengeById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

// Crear una nueva misión
const createChallenge = async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .insert([{ name, description }]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

// Actualizar una misión
const updateChallenge = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

// Eliminar una misión
const deleteChallenge = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send(); // No content
  } catch (error) {
    res.status(400).json({ error: "Error" });
  }
};

export { getChallenges, getChallengeById, createChallenge, updateChallenge, deleteChallenge, getChallengesPoints };
