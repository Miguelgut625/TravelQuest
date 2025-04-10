import React, { useEffect, useState, useRef } from 'react';
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
import { registerForPushNotificationsAsync, saveUserPushToken } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

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
          
          // Registrar el dispositivo para notificaciones push
          try {
            console.log('Registrando dispositivo para notificaciones push...');
            // Obtener token de notificaciones
            const pushToken = await registerForPushNotificationsAsync();
            console.log('Token obtenido:', pushToken ? 'Sí' : 'No');
            
            if (pushToken) {
              // Guardar el token en la base de datos
              const tokenSaved = await saveUserPushToken(session.user.id, pushToken);
              console.log('Token guardado en base de datos:', tokenSaved ? 'Éxito' : 'Fallo');
            } else {
              console.warn('No se pudo obtener un token de notificaciones. Verifica los permisos del dispositivo.');
            }
          } catch (notificationError) {
            console.error('Error registrando notificaciones push:', notificationError);
          }
        } else {
          console.log('No hay sesión activa');
          store.dispatch(setAuthState('unauthenticated'));
        }

      } catch (error: any) {
        console.error('Error inicializando la app:', error);
        // Mensaje de error más descriptivo
        setError(`Error al inicializar la aplicación: ${error.message || 'Error desconocido'}`);
        store.dispatch(setAuthState('unauthenticated'));
      } finally {
        // Añadir un pequeño retraso para asegurar que todos los componentes se inicialicen correctamente
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    initializeApp();
    
    // Configurar los escuchadores de notificaciones
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Respuesta a notificación recibida:', response);
      
      // Aquí puedes manejar la interacción del usuario con la notificación
      // Por ejemplo, navegar a una pantalla específica si hacen clic en ella
      const data = response.notification.request.content.data;
      
      if (data && data.type === 'new_message' && data.senderId) {
        // Aquí añadirías la lógica para navegar a la conversación correspondiente
        // Pero esto requeriría acceso al objeto de navegación, que no está disponible aquí
        console.log('El usuario ha pulsado una notificación de mensaje del usuario:', data.senderId);
      }
    });
    
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
      
      // Limpiar listeners al desmontar
      return () => {
        window.removeEventListener('error', (event) => {
          handleError(event.error);
        });
        window.removeEventListener('unhandledrejection', (event) => {
          handleError(event.reason);
        });
        
        // Limpia los escuchadores de notificaciones
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
      };
    }
    
    // Si no estamos en web, solo limpiar los escuchadores de notificaciones
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
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
          <SafeAreaProvider style={{ paddingTop: 30, backgroundColor: 'white' }}>
            <AppNavigator />
          </SafeAreaProvider>
        </PaperProvider>
      </PersistGate>
    </Provider>
  );
};

export default App; 