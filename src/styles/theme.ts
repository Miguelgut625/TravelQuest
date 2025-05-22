import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E3A8A',
    secondary: '#3B82F6',
    tertiary: '#60A5FA',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    onSurface: '#0F172A',
    onPrimary: '#FFFFFF',
    error: '#DC2626',
    accent: '#2563EB',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3B82F6',
    secondary: '#60A5FA',
    tertiary: '#93C5FD',
    background: '#0F172A',
    surface: '#1E293B',
    onSurface: '#F8FAFC',
    onPrimary: '#0F172A',
    error: '#EF4444',
    accent: '#60A5FA',
  },
};

export const commonStyles = {
  // Sombras
  shadow: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
  },

  // Bordes
  borderRadius: {
    small: 8,
    medium: 15,
    large: 20,
    round: 50,
  },

  // Espaciado
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Tipografía
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
    },
    caption: {
      fontSize: 14,
    },
    small: {
      fontSize: 12,
    },
  },

  // Componentes comunes
  components: {
    card: {
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 24,
    },
    button: {
      borderRadius: 15,
      padding: 15,
      marginBottom: 10,
    },
    input: {
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
  },
}; 