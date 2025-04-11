const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Configuración específica para Expo/React Native
defaultConfig.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');

module.exports = {
    ...defaultConfig,
    resolver: {
        ...defaultConfig.resolver,
        sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
    },
}; 