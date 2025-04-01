import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Asegurarse de que el polyfill se cargue antes de cualquier otra cosa
require('react-native-url-polyfill/auto');

AppRegistry.registerComponent(appName, () => App); 