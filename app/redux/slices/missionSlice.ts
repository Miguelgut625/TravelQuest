import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Mission {
  id: string;
  cityId: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  completed: boolean;
  photos: string[];
  notes: string;
}

interface MissionState {
  missions: Mission[];
  activeMission: Mission | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MissionState = {
  missions: [],
  activeMission: null,
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
    setActiveMission: (state, action: PayloadAction<Mission>) => {
      state.activeMission = action.payload;
    },
    addMission: (state, action: PayloadAction<Mission>) => {
      state.missions.push(action.payload);
    },
    updateMission: (state, action: PayloadAction<Mission>) => {
      const index = state.missions.findIndex(mission => mission.id === action.payload.id);
      if (index !== -1) {
        state.missions[index] = action.payload;
      }
    },
    completeMission: (state, action: PayloadAction<string>) => {
      const mission = state.missions.find(m => m.id === action.payload);
      if (mission) {
        mission.completed = true;
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
  setActiveMission,
  addMission,
  updateMission,
  completeMission,
  setLoading,
  setError,
} = missionSlice.actions;

export default missionSlice.reducer;