import React, { useEffect, useState } from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuthState, setUser } from './src/features/auth/authSlice';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getCloudinaryConfigInfo } from './src/services/cloudinaryService';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#005F9E',
    accent: '#FFB74D',
    background: '#F5F7FA',
    text: '#333333',
    placeholder: '#78909C',
    surface: '#FFFFFF',
    error: '#D32F2F',
  },
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log(`Iniciando la aplicación en plataforma: ${Platform.OS}`);

        // Comprobar si hay alguna incompatibilidad específica de la plataforma
        if (Platform.OS === 'web') {
          console.log('Ejecutando en modo web');
        }

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
        setError(`Error al inicializar la aplicación: ${error.message || 'Error desconocido'}`);
        store.dispatch(setAuthState('unauthenticated'));
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    initializeApp();

    // Manejador global de errores no capturados
    const handleError = (error: Error) => {
      console.error('Error no capturado:', error);
    };

    // Configurar listeners globales de error
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        handleError(event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason);
      });

      return () => {
        window.removeEventListener('error', (event) => {
          handleError(event.error);
        });
        window.removeEventListener('unhandledrejection', (event) => {
          handleError(event.reason);
        });
      };
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={24} color="#005F9E" />
        <Text style={{ marginTop: 10 }}>Cargando TravelQuest...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
          {error}
        </Text>
        <Text style={{ textAlign: 'center' }}>
          Por favor, intenta recargar la aplicación o contacta con soporte.
        </Text>
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