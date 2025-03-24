import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'password_recovery';

interface CustomUser {
  id: string;
  email: string | null;
  username?: string;
  profilePicture?: string;
}

interface AuthSliceState {
  user: CustomUser | null;
  authState: AuthState;
  error: string | null;
}

const initialState: AuthSliceState = {
  user: null,
  authState: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<CustomUser | null>) => {
      state.user = action.payload;
      state.authState = action.payload ? 'authenticated' : 'unauthenticated';
    },
    setAuthState: (state, action: PayloadAction<AuthState>) => {
      state.authState = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setUser, setAuthState, setError } = authSlice.actions;
export default authSlice.reducer; 