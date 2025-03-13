import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JournalEntry {
  id: string;
  cityId: string;
  missionId?: string;
  title: string;
  content: string;
  photos: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  tags: string[];
}

interface JournalState {
  entries: { [cityId: string]: JournalEntry[] };
  isLoading: boolean;
  error: string | null;
}

const initialState: JournalState = {
  entries: {},
  isLoading: false,
  error: null,
};

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    addEntry: (state, action: PayloadAction<JournalEntry>) => {
      const { cityId } = action.payload;
      if (!state.entries[cityId]) {
        state.entries[cityId] = [];
      }
      state.entries[cityId].push(action.payload);
    },
    updateEntry: (state, action: PayloadAction<JournalEntry>) => {
      const { cityId, id } = action.payload;
      const cityEntries = state.entries[cityId];
      if (cityEntries) {
        const index = cityEntries.findIndex(entry => entry.id === id);
        if (index !== -1) {
          cityEntries[index] = action.payload;
        }
      }
    },
    deleteEntry: (state, action: PayloadAction<{ cityId: string; entryId: string }>) => {
      const { cityId, entryId } = action.payload;
      if (state.entries[cityId]) {
        state.entries[cityId] = state.entries[cityId].filter(entry => entry.id !== entryId);
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
  addEntry,
  updateEntry,
  deleteEntry,
  setLoading,
  setError,
} = journalSlice.actions;

export default journalSlice.reducer; 