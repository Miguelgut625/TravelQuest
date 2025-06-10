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
import { registerForPushNotificationsAsync, saveUserPushToken } from './src/services/NotificationService';
import NotificationService from './src/services/NotificationService';
import * as Notifications from 'expo-notifications';

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

// Componente interno que tiene acceso al ThemeProvider
const AppContent = () => {
  const { isDarkMode, colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log(`Iniciando la aplicación en plataforma: ${Platform.OS}`);

        if (Platform.OS === 'web') {
          console.log('Ejecutando en modo web');
        }

        // **INICIALIZAR SISTEMA DE NOTIFICACIONES**
        console.log('🔔 Inicializando sistema de notificaciones...');
        
        // Inicializar el servicio de notificaciones
        const notificationService = NotificationService.getInstance();
        await notificationService.init();
        
        // Verificar sesión actual
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

          // **REGISTRAR TOKEN PUSH PARA USUARIO AUTENTICADO**
          if (Platform.OS !== 'web') {
            try {
              const pushToken = await registerForPushNotificationsAsync();
              if (pushToken) {
                await saveUserPushToken(session.user.id, pushToken);
                console.log('✅ Token de notificaciones actualizado para usuario autenticado');
              }
            } catch (tokenError) {
              console.error('❌ Error actualizando token de notificaciones:', tokenError);
            }
          }
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

    // **CONFIGURAR LISTENERS DE NOTIFICACIONES**
    let notificationListener: any;
    let responseListener: any;

    if (Platform.OS !== 'web') {
      // Listener para notificaciones recibidas mientras la app está activa
      notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notificación recibida:', notification);
      });

      // Listener para cuando el usuario toca una notificación
      responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Usuario tocó notificación:', response);
        // Aquí puedes agregar navegación basada en el tipo de notificación
        const notificationData = response.notification.request.content.data;
        if (notificationData?.type) {
          console.log('Tipo de notificación:', notificationData.type);
          // Implementar navegación según el tipo
        }
      });
    }

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

    // Cleanup de listeners de notificaciones
    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size={24} color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text.primary }}>Cargando TravelQuest...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 10 }}>
          {error}
        </Text>
        <Text style={{ textAlign: 'center', color: colors.text.primary }}>
          Por favor, intenta recargar la aplicación o contacta con soporte.
        </Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <NavigationContainer linking={linking} theme={{
            dark: isDarkMode,
            colors: {
              background: colors.background,
              border: colors.border,
              card: colors.surface,
              text: colors.text.primary,
              notification: colors.primary,
              primary: colors.primary,
            },
          }}>
            <AppNavigator />
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </PaperProvider>
  );
};

// Componente principal que envuelve todo con los providers necesarios
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App; 