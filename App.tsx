import React, { useEffect, useState } from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuthState, setUser } from './src/features/auth/authSlice';
import { Provider as PaperProvider, DefaultTheme, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getCloudinaryConfigInfo } from './src/services/cloudinaryService';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { linking } from './src/navigation/linking';

const lightTheme = {
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

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#41729F',
    accent: '#FFB74D',
    background: '#1B263B',
    text: '#EDF6F9',
    placeholder: '#A9D6E5',
    surface: '#274472',
    error: '#FF6B6B',
  },
};

const App = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log(`Iniciando la aplicación en plataforma: ${Platform.OS}`);

        if (Platform.OS === 'web') {
          console.log('Ejecutando en modo web');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError);
          throw sessionError;
        }

        const cloudinaryConfig = getCloudinaryConfigInfo();
        console.log('Estado configuración Cloudinary:',
          cloudinaryConfig.isConfigured ? 'OK' : 'No configurado',
          __DEV__ && cloudinaryConfig.usingFallback ? '(usando fallback)' : ''
        );

        if (session?.user) {
          console.log('Usuario autenticado encontrado:', session.user.email);
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, role')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error obteniendo datos del usuario:', userError);
          }

          store.dispatch(setUser({
            email: session.user.email || '',
            id: session.user.id,
            username: userData?.username || session.user.user_metadata?.username,
            role: userData?.role || 'user'
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

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleError = (error: Error) => {
        console.error('Error no capturado:', error);
      };

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1B263B' : '#F5F7FA' }}>
        <ActivityIndicator size={24} color={isDarkMode ? '#41729F' : '#005F9E'} />
        <Text style={{ marginTop: 10, color: isDarkMode ? '#EDF6F9' : '#333333' }}>Cargando TravelQuest...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: isDarkMode ? '#1B263B' : '#F5F7FA' }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
          {error}
        </Text>
        <Text style={{ textAlign: 'center', color: isDarkMode ? '#EDF6F9' : '#333333' }}>
          Por favor, intenta recargar la aplicación o contacta con soporte.
        </Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
            <SafeAreaProvider>
              <NavigationContainer theme={{
                dark: isDarkMode,
                colors: {
                  background: isDarkMode ? '#1B263B' : '#FFFFFF',
                  border: isDarkMode ? '#274472' : '#e5e5e5',
                  card: isDarkMode ? '#274472' : '#FFFFFF',
                  text: isDarkMode ? '#EDF6F9' : '#222222',
                  notification: isDarkMode ? '#41729F' : '#005F9E',
                  primary: isDarkMode ? '#41729F' : '#005F9E',
                },
              }}>
                <AppNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </PaperProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App; 