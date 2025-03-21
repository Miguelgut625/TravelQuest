import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  email: string;
  id: string;
}

interface AuthState {
  user: User | null;
  authState: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  authState: 'unauthenticated',
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.authState = 'authenticated';
      state.error = null;
    },
    setAuthState: (state, action: PayloadAction<AuthState['authState']>) => {
      state.authState = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.authState = 'unauthenticated';
      state.error = null;
    },
  },
});

const persistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'authState'],
};

export const { setUser, logout, setAuthState, setError } = authSlice.actions;
export default persistReducer(persistConfig, authSlice.reducer);