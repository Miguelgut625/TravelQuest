import axios from 'axios';
import { API_URL } from '../config/api';

export const getRouteById = async (routeId: string) => {
  try {
    const response = await axios.get(`${API_URL}/routes/${routeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
};

export const getRoutesByJourney = async (journeyId: string) => {
  try {
    const response = await axios.get(`${API_URL}/routes/journey/${journeyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const createRoute = async (routeData: any) => {
  try {
    const response = await axios.post(`${API_URL}/routes`, routeData);
    return response.data;
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

export const updateRoute = async (routeId: string, routeData: any) => {
  try {
    const response = await axios.put(`${API_URL}/routes/${routeId}`, routeData);
    return response.data;
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

export const deleteRoute = async (routeId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/routes/${routeId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
}; 