const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Personalizar la configuración de webpack aquí
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native/Libraries/Utilities/codegenNativeCommands': 'react-native-web/dist/vendor/react-native/NativeCommands',
    'react-native-maps': 'react-native-web-maps',
  };

  return config;
};
