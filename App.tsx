import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { testSupabaseConnection } from './src/services/testConnection';
import * as Font from 'expo-font';
import { ActivityIndicator, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testSupabaseConnection();
      console.log('Conexión a Supabase:', isConnected ? 'Exitosa' : 'Fallida');
    };

    const loadFonts = async () => {
      try {
        // Intentar cargar las fuentes sin Ionicons primero
        await Font.loadAsync({
          // Aquí puedes agregar otras fuentes si las necesitas
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error cargando fuentes:', error);
        setError('Error al cargar las fuentes. La aplicación continuará sin algunos íconos.');
        // Continuar la aplicación incluso si hay error
        setFontsLoaded(true);
      }
    };

    checkConnection();
    loadFonts();
  }, [retryCount]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
      <AppNavigator />
    </Provider>
  );
};

export default App; 