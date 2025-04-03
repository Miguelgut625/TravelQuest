import React, { useEffect, useState } from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, Text } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuthState, setUser, logout } from './src/features/authSlice';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getCloudinaryConfigInfo } from './src/services/cloudinaryService';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',
    accent: '#03A9F4',
  },
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Iniciando la aplicación...');
        
        // Verificar sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError);
          throw sessionError;
        }

        // Verificar configuración de Cloudinary
        const cloudinaryConfig = getCloudinaryConfigInfo();
        console.log('Estado configuración Cloudinary:',
          cloudinaryConfig.isConfigured ? 'OK' : 'No configurado',
          __DEV__ && cloudinaryConfig.usingFallback ? '(usando fallback)' : ''
        );

        if (session?.user) {
          console.log('Usuario autenticado encontrado:', session.user.email);
          store.dispatch(setUser({
            email: session.user.email || '',
            id: session.user.id,
            username: session.user.user_metadata?.username
          }));
          store.dispatch(setAuthState('authenticated'));
        } else {
          console.log('No hay sesión activa');
          store.dispatch(setAuthState('unauthenticated'));
        }

      } catch (error) {
        console.error('Error inicializando la app:', error);
        setError('Error al inicializar la aplicación');
        store.dispatch(logout());
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </PaperProvider>
      </PersistGate>
    </Provider>
  );
};

export default App; 