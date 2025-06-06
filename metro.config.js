const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimización básica de memoria
config.maxWorkers = 2;

// Configuración simple del resolver
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Excluir archivos problemáticos
config.resolver.blockList = [
  /node_modules\/.*\/Podfile\.lock$/,
  /\.git\/.*/,
];

module.exports = config; 