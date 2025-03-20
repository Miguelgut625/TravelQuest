import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  authState: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'password_recovery';
}

const initialState: AuthState = {
  user: null,
  token: null,
  authState: 'idle'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.authState = 'authenticated';
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setAuthState: (state, action: PayloadAction<AuthState['authState']>) => {
      state.authState = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.authState = 'unauthenticated';
    },
  },
});

const persistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token', 'authState'],
};

export const { setUser, setToken, logout, setAuthState } = authSlice.actions;
export default persistReducer(persistConfig, authSlice.reducer); 