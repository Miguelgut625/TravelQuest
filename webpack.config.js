const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyLockCorePath: true
    }
  }, argv);

  // Personalizar la configuración antes de devolverla
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native': 'react-native-web',
    'react-native-maps': 'react-native-web-maps',
    '@react-native/assets-registry/registry': 'react-native-web/dist/modules/AssetRegistry',
    'react-native/Libraries/Image/AssetRegistry': 'react-native-web/dist/modules/AssetRegistry',
    'react-native/Libraries/Image/AssetSourceResolver': 'react-native-web/dist/modules/AssetSourceResolver',
    'react-native/Libraries/Image/resolveAssetSource': 'react-native-web/dist/modules/resolveAssetSource'
  };

  // Configuración para manejar archivos estáticos
  config.module.rules.push({
    test: /\.(png|jpe?g|gif|ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'assets/'
        }
      }
    ]
  });

  // Configuración específica para expo-asset
  config.module.rules.push({
    test: /expo-asset/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        plugins: [
          ['@babel/plugin-proposal-class-properties', { loose: true }],
          '@babel/plugin-transform-runtime'
        ]
      }
    }
  });

  return config;
};
