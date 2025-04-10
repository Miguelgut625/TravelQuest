// Esta definición permite que los ActivityIndicator acepten "large" como size
declare module 'react-native' {
  interface ActivityIndicatorProps {
    size?: number | 'small' | 'large';
  }
} 