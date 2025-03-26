import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authReducer from './auth/authSlice';
import missionReducer from './missionSlice';
import journalReducer from './journalSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import journeyReducer from './journey/journeySlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'],
  blacklist: ['missions', 'journal', 'journey'],
  debug: true, // Habilitar logs de depuración
  timeout: 0, // Evitar timeout en la persistencia
  writeFailHandler: (err: any) => {
    console.error('Error al persistir el estado:', err);
  }
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    missions: missionReducer,
    journal: journalReducer,
    journey: journeyReducer,
  },
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
    journey: state.journey
  });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 