module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      '@babel/plugin-proposal-export-namespace-from',
      ['module-resolver', {
        alias: {
          '@expo/vector-icons': 'react-native-vector-icons'
        }
      }]
    ]
  };
}; 