const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Configuración específica para Expo/React Native
defaultConfig.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');

// Configuración para manejar módulos nativos y shims
defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  // Incluir shims para módulos que podrían causar problemas
  'react-native-maps': require.resolve('react-native-maps'),
};

module.exports = {
    ...defaultConfig,
    resolver: {
        ...defaultConfig.resolver,
        sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
        assetExts: [...defaultConfig.resolver.assetExts, 'db', 'sqlite'],
    },
}; 