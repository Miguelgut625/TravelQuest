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
    // Cesium aliases
    cesium: path.resolve(__dirname, 'node_modules/cesium'),
    // Supabase shims
    '@supabase/postgrest-js': path.resolve(__dirname, 'src/services/postgrest-shim.js'),
    '@supabase/functions-js': path.resolve(__dirname, 'src/services/supabase-shims.js'),
    '@supabase/realtime-js': path.resolve(__dirname, 'src/services/supabase-shims.js'),
    '@supabase/storage-js': path.resolve(__dirname, 'src/services/supabase-shims.js'),
    // Versiones web de componentes específicos
    './src/services/supabase.ts': path.resolve(__dirname, 'src/services/supabase.web.ts'),
    './src/screens/main/MapScreen.tsx': path.resolve(__dirname, 'src/screens/main/MapScreen.web.tsx')
  };

  // Configuración para Cesium
  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/cesium/Build/Cesium',
          to: 'cesium'
        }
      ]
    }),
    new DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify('/cesium')
    })
  );

  // Agregar la configuración de amd para Cesium
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.js$/,
    include: /cesium/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env']
      }
    }
  });

  // Configurar la salida de Cesium
  config.output = config.output || {};
  config.output.sourcePrefix = '';
  config.output.globalObject = 'window';
  config.output.publicPath = '/';

  return config;
};
