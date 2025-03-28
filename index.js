import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { name as appName } from './app.json';

// Registramos el componente raíz tanto para Expo como para React Native puro
AppRegistry.registerComponent(appName, () => App);
registerRootComponent(App); 