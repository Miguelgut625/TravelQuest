import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Mission {
  id: string;
  title: string;
  description: string;
  city: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  completed: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  requirements?: string[];
  hints?: string[];
}

interface MissionState {
  missions: Mission[];
  activeMissions: Mission[];
  completedMissions: Mission[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MissionState = {
  missions: [],
  activeMissions: [],
  completedMissions: [],
  isLoading: false,
  error: null,
};

const missionSlice = createSlice({
  name: 'missions',
  initialState,
  reducers: {
    setMissions: (state, action: PayloadAction<Mission[]>) => {
      state.missions = action.payload;
    },
    addActiveMission: (state, action: PayloadAction<Mission>) => {
      state.activeMissions.push(action.payload);
    },
    completeMission: (state, action: PayloadAction<string>) => {
      const mission = state.activeMissions.find(m => m.id === action.payload);
      if (mission) {
        mission.completed = true;
        state.completedMissions.push(mission);
        state.activeMissions = state.activeMissions.filter(m => m.id !== action.payload);
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
  setMissions,
  addActiveMission,
  completeMission,
  setLoading,
  setError,
} = missionSlice.actions;

export default missionSlice.reducer; 