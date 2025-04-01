import 'react-native-url-polyfill/auto';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/features/store';
import AppNavigator from './src/navigation/AppNavigator';
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </SafeAreaProvider>
  );
};

AppRegistry.registerComponent('TravelQuest', () => App);

export default App; 