import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  email: string;
  id: string;
  username?: string;
  profilePicUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  authState: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'password_recovery';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
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
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setAuthState: (state, action: PayloadAction<AuthState['authState']>) => {
      state.authState = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      console.log('Ejecutando logout en authSlice');
      state.user = null;
      state.token = null;
      state.authState = 'unauthenticated';
      state.error = null;
      console.log('Estado después del logout:', state);
      return state;
    },
  },
});

export const { setUser, updateUser, setToken, logout, setAuthState, setError } = authSlice.actions;
export default authSlice.reducer;