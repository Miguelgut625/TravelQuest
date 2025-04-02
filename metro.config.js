const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuración básica para manejar URLs
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

// Añadir resolución para las fuentes de los iconos
config.resolver.assetExts.push('ttf');
config.resolver.sourceExts.push('cjs');

module.exports = config; 