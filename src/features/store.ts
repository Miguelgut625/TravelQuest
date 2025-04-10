import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authReducer from './auth/authSlice';
import missionReducer from './missionSlice';
import journalReducer from '../features/journalSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import journeyReducer from './journey/journeySlice';
import { combineReducers } from '@reduxjs/toolkit';
import { createMigrate } from 'redux-persist';

const migrations = {
  0: (state: any) => {
    return {
      ...state,
      auth: {
        ...state.auth,
        _persist: state.auth?._persist
      }
    };
  }
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'],
  blacklist: ['missions', 'journal', 'journey'],
  debug: true, // Habilitar logs de depuración
  timeout: 0, // Evitar timeout en la persistencia
  version: 0,
  migrate: createMigrate(migrations, { debug: true }),
  writeFailHandler: (err: any) => {
    console.error('Error al persistir el estado:', err);
  }
};

const rootReducer = combineReducers({
  auth: authReducer,
  missions: missionReducer,
  journal: journalReducer,
  journey: journeyReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
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