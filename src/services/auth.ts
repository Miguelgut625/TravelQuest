import { supabase } from './supabase';
import { store } from '../features/store';
import { setUser, setAuthState } from '../features/auth/authSlice';

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    store.dispatch(setUser(null));
    store.dispatch(setAuthState('unauthenticated'));
    return true;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return false;
  }
};

export const ensureValidSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (session) {
      store.dispatch(setUser({
        id: session.user.id,
        email: session.user.email,
      }));
      store.dispatch(setAuthState('authenticated'));
      return true;
    }
    
    store.dispatch(setUser(null));
    store.dispatch(setAuthState('unauthenticated'));
    return false;
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    store.dispatch(setUser(null));
    store.dispatch(setAuthState('unauthenticated'));
    return false;
  }
}; 