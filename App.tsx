import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ActivityIndicator, View, Text } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuthState } from './src/features/authSlice';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Iniciando la aplicación...');
        
        // Verificar conexión con Supabase
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);

        if (error) {
          console.error('Error conectando con Supabase:', error);
          throw error;
        }

        console.log('Conexión con Supabase establecida');
        store.dispatch(setAuthState('unauthenticated'));

      } catch (error) {
        console.error('Error inicializando la app:', error);
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
        <AppNavigator />
      </PersistGate>
    </Provider>
  );
};

export default App; 