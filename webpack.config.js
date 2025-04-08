const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Personalizar la configuración de webpack aquí
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native/Libraries/Utilities/codegenNativeCommands': 'react-native-web/dist/vendor/react-native/NativeCommands',
    'react-native-maps': 'react-native-web-maps',
    // Cesium aliases
    cesium: path.resolve(__dirname, 'node_modules/cesium')
  };

  // Configuración para Cesium
  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/cesium/Build/Cesium/Workers',
          to: 'Workers'
        },
        {
          from: 'node_modules/cesium/Build/Cesium/Assets',
          to: 'Assets'
        },
        {
          from: 'node_modules/cesium/Build/Cesium/Widgets',
          to: 'Widgets'
        }
      ]
    }),
    new DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify('')
    })
  );

  // Agregar la configuración de amd para Cesium
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.js$/,
    include: path.resolve(__dirname, 'node_modules/cesium/Source'),
    use: { loader: 'babel-loader' }
  });

  // Configurar la salida de Cesium
  config.output = config.output || {};
  config.output.sourcePrefix = '';

  return config;
};
