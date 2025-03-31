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
  entries: Record<string, any[]>;
  isLoading: boolean;
  error: string | null;
  shouldRefresh: boolean;
}

const initialState: JournalState = {
  entries: {},
  isLoading: false,
  error: null,
  shouldRefresh: false
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
    setJournalEntries: (state, action: PayloadAction<Record<string, any[]>>) => {
      state.entries = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setJournalLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setJournalError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setRefreshJournal: (state, action: PayloadAction<boolean>) => {
      state.shouldRefresh = action.payload;
    }
  },
});

export const {
  addEntry,
  updateEntry,
  deleteEntry,
  setLoading,
  setError,
  setJournalEntries,
  setJournalLoading,
  setJournalError,
  setRefreshJournal
} = journalSlice.actions;

export default journalSlice.reducer; 