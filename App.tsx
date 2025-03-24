import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { testSupabaseConnection } from './src/services/testConnection';
import { ActivityIndicator, View, Text } from 'react-native';
import { linking } from './src/navigation/linking';
import { supabase } from './src/services/supabase';
import { setUser, setToken, logout, setAuthState } from './src/features/authSlice';
import { Linking } from 'react-native';

const App = () => {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Iniciando la aplicación...');

        // Verificar conexión con Supabase
        const isConnected = await testSupabaseConnection();
        console.log('Estado de conexión Supabase:', isConnected ? 'Exitosa' : 'Fallida');

        // Verificar si la app se abrió desde un enlace de recuperación de contraseña
        const initialUrl = await Linking.getInitialURL();
        console.log('URL inicial:', initialUrl);

        if (initialUrl?.includes('type=recovery')) {
          console.log('Detectado enlace de recuperación de contraseña');
          store.dispatch(setAuthState('password_recovery'));
          setIsInitializing(false);
          return;
        }

        // Verificar sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error al verificar sesión:', sessionError);
          store.dispatch(logout());
        } else if (session) {
          // Aquí puedes agregar lógica para verificar si la sesión ha expirado
          const currentTime = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at < currentTime) {
            console.log('La sesión ha expirado, cerrando sesión...');
            store.dispatch(logout());
          } else {
            console.log('Sesión activa encontrada, configurando usuario...');
            store.dispatch(setUser({
              id: session.user.id,
              email: session.user.email!,
              username: session.user.user_metadata.username || session.user.email!.split('@')[0],
            }));
            store.dispatch(setToken(session.access_token));
            store.dispatch(setAuthState('authenticated'));
          }
        } else {
          console.log('No hay sesión activa, mostrando pantalla de login');
          store.dispatch(setAuthState('unauthenticated'));
        }

        console.log('Inicialización completada');
      } catch (error) {
        console.error('Error inicializando la app:', error);
        setError('Error al inicializar la aplicación');
        store.dispatch(logout());
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [retryCount]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 20, color: '#666' }}>
          Inicializando...
        </Text>
        {error && (
          <Text style={{ marginTop: 10, color: 'red', textAlign: 'center', padding: 20 }}>
            {error}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppNavigator linking={linking} />
      </PersistGate>
    </Provider>
  );
};

export default App; 