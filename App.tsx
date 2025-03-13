import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { testSupabaseConnection } from './src/services/testConnection';

const App = () => {
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testSupabaseConnection();
      console.log('Conexión a Supabase:', isConnected ? 'Exitosa' : 'Fallida');
    };

    checkConnection();
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App; 