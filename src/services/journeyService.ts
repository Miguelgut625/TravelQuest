import axios from 'axios';
import { API_URL } from '../config/api';

export const getJourneyById = async (journeyId: string) => {
  try {
    const response = await axios.get(`${API_URL}/journeys/${journeyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching journey:', error);
    throw error;
  }
};

export const getJourneysByUser = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/journeys/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching journeys:', error);
    throw error;
  }
};

export const createJourney = async (journeyData: any) => {
  try {
    const response = await axios.post(`${API_URL}/journeys`, journeyData);
    return response.data;
  } catch (error) {
    console.error('Error creating journey:', error);
    throw error;
  }
};

export const updateJourney = async (journeyId: string, journeyData: any) => {
  try {
    const response = await axios.put(`${API_URL}/journeys/${journeyId}`, journeyData);
    return response.data;
  } catch (error) {
    console.error('Error updating journey:', error);
    throw error;
  }
};

export const deleteJourney = async (journeyId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/journeys/${journeyId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting journey:', error);
    throw error;
  }
};

export const shareJourney = async (journeyId: string, userId: string, friends: any[]) => {
  try {
    const response = await axios.post(`${API_URL}/journeys/${journeyId}/share`, { 
      userId,
      friends 
    });
    return response.data;
  } catch (error) {
    console.error('Error sharing journey:', error);
    throw error;
  }
}; 