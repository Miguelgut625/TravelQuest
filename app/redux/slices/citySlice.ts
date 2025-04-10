import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface City {
  id: string;
  name: string;
  correctedName: string;
  country: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  imageUrl: string;
  totalMissions: number;
  completedMissions: number;
}

interface CityState {
  cities: City[];
  selectedCity: City | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CityState = {
  cities: [],
  selectedCity: null,
  isLoading: false,
  error: null,
};

const citySlice = createSlice({
  name: 'cities',
  initialState,
  reducers: {
    setCities: (state, action: PayloadAction<City[]>) => {
      state.cities = action.payload;
    },
    setSelectedCity: (state, action: PayloadAction<City>) => {
      state.selectedCity = action.payload;
    },
    updateCityProgress: (state, action: PayloadAction<{ cityId: string; completed: boolean }>) => {
      const city = state.cities.find(c => c.id === action.payload.cityId);
      if (city) {
        city.completedMissions += action.payload.completed ? 1 : -1;
      }
    },
    setCorrectedName: (state, action: PayloadAction<{ cityId: string; correctedName: string }>) => {
      const city = state.cities.find(c => c.id === action.payload.cityId);
      if (city) {
        city.correctedName = action.payload.correctedName;
      }
      if (state.selectedCity && state.selectedCity.id === action.payload.cityId) {
        state.selectedCity.correctedName = action.payload.correctedName;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCities,
  setSelectedCity,
  updateCityProgress,
  setCorrectedName,
  setLoading,
  setError,
} = citySlice.actions;

export default citySlice.reducer; 