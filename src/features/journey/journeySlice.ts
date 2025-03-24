import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JourneyMission } from '../../types/journey';

interface JourneyState {
  missions: JourneyMission[];
  loading: boolean;
  error: string | null;
}

const initialState: JourneyState = {
  missions: [],
  loading: false,
  error: null,
};

const journeySlice = createSlice({
  name: 'journey',
  initialState,
  reducers: {
    setMissions: (state, action: PayloadAction<JourneyMission[]>) => {
      state.missions = action.payload;
    },
    completeMission: (state, action: PayloadAction<string>) => {
      const mission = state.missions.find(m => m.id === action.payload);
      if (mission) {
        mission.completed = true;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setMissions, completeMission, setLoading, setError } = journeySlice.actions;
export default journeySlice.reducer; 