import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, Text } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuthState, setUser, logout } from './src/features/authSlice';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',
    secondary: '#FFA000',
    background: '#f5f5f5',
    surface: 'white',
    error: '#f44336',
  },
};

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);

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
          store.dispatch(logout());
        }

      } catch (error) {
        console.error('Error inicializando la app:', error);
        store.dispatch(logout());
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 20, color: '#666' }}>
          Iniciando...
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