import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authReducer from './auth/authSlice';
import missionReducer from './missionSlice';
import journalReducer from '../features/journalSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import journeyReducer from './journey/journeySlice';
import cityReducer from '../../app/redux/slices/citySlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'],
  blacklist: ['missions', 'journal', 'journey', 'cities'],
  debug: true, // Habilitar logs de depuración
  timeout: 0, // Evitar timeout en la persistencia
  writeFailHandler: (err: any) => {
    console.error('Error al persistir el estado:', err);
  }
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const rootReducer = {
  auth: persistedAuthReducer,
  missions: missionReducer,
  journal: journalReducer,
  journey: journeyReducer,
  cities: cityReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

// Agregar listener para depuración
store.subscribe(() => {
  const state = store.getState();
  console.log('Estado actual:', {
    auth: state.auth,
    missions: state.missions,
    journal: state.journal,
    journey: state.journey,
    cities: state.cities
  });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 