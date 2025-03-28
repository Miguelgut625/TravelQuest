import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import missionReducer from './missionSlice';
import cityMissionReducer from './cityMissionSlice';
import journalReducer from './journalSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    missions: missionReducer,
    cityMission: cityMissionReducer,
    journal: journalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 