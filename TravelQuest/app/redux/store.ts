import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import missionReducer from './slices/missionSlice';
import cityReducer from './slices/citySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    missions: missionReducer,
    cities: cityReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 