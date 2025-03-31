import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CityMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
}

interface CityMissionState {
  searchCity: string;
  duration: string;
  missionCount: string;
  description: string;
  cityId: string | null;
  cityMarker: CityMarker | null;
}

const initialState: CityMissionState = {
  searchCity: '',
  duration: '',
  missionCount: '',
  description: '',
  cityId: null,
  cityMarker: null,
};

const cityMissionSlice = createSlice({
  name: 'cityMission',
  initialState,
  reducers: {
    setCityMissionData(state, action: PayloadAction<Partial<CityMissionState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const { setCityMissionData } = cityMissionSlice.actions;
export default cityMissionSlice.reducer;