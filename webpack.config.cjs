const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Personaliza la configuración antes de devolverla.
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-maps': 'react-native-web-maps',
    'react-native$': 'react-native-web',
  };

  // Asegúrate de que la propiedad 'entry' sea un array no vacío
  config.entry = './src/index.js'; // Cambia esto a la ruta correcta de tu archivo de entrada

  return config;
};