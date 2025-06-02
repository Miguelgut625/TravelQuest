const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
    ...defaultConfig,
    resolver: {
        ...defaultConfig.resolver,
        sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
        // Deshabilitar package exports para resolver problemas con ws en SDK 53
        unstable_enablePackageExports: false,
        alias: {
            // Solo los aliases más esenciales
            'ws': false,
            'stream': false,
            'crypto': false,
            'fs': false,
            'net': false,
            'tls': false,
        },
        platforms: ['ios', 'android', 'web', 'native'],
    },
    transformer: {
        ...defaultConfig.transformer,
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: false,
            },
        }),
    },
}; 