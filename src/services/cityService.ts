import axios from 'axios';
import { API_URL } from '../config/api';

export const getCities = async () => {
  try {
    const response = await axios.get(`${API_URL}/cities`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo ciudades:', error);
    throw error;
  }
};

export const getCityById = async (cityId: string) => {
  try {
    const response = await axios.get(`${API_URL}/cities/${cityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching city:', error);
    throw error;
  }
};

export const getCitiesByCountry = async (countryId: string) => {
  try {
    const response = await axios.get(`${API_URL}/cities/country/${countryId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }
};

export const searchCities = async (query: string) => {
  try {
    const response = await axios.get(`${API_URL}/cities/search`, {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching cities:', error);
    throw error;
  }
};

export const createCity = async (cityData: any) => {
  try {
    const response = await axios.post(`${API_URL}/cities`, cityData);
    return response.data;
  } catch (error) {
    console.error('Error creating city:', error);
    throw error;
  }
};

export const updateCity = async (cityId: string, cityData: any) => {
  try {
    const response = await axios.put(`${API_URL}/cities/${cityId}`, cityData);
    return response.data;
  } catch (error) {
    console.error('Error updating city:', error);
    throw error;
  }
};

export const deleteCity = async (cityId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/cities/${cityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting city:', error);
    throw error;
  }
}; 