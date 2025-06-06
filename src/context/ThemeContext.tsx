import React, { createContext, useContext, useEffect, useState } from 'react';
// import { useColorScheme } from '@react-native-community/hooks'; // Si quieres soporte automático, instala este paquete o usa Appearance de react-native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../styles/theme';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof lightColors;
  setTheme: (theme: ThemeType) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  colors: lightColors,
  setTheme: () => {},
  isDarkMode: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('system');
  // Por defecto, usar 'light'. Si quieres soporte automático, usa Appearance.getColorScheme() o instala @react-native-community/hooks
  const systemColorScheme = 'light';

  useEffect(() => {
    // Cargar la preferencia guardada del usuario
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem('userTheme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Determinar qué colores usar basado en el tema seleccionado y el tema del sistema
  // Si quieres soporte real de tema del sistema, usa Appearance.getColorScheme() o un hook
  const isSystemDark = false;
  const colors = theme === 'system' 
    ? (isSystemDark ? darkColors : lightColors)
    : (theme === 'dark' ? darkColors : lightColors);

  // Si el tema es 'system', isDarkMode es true solo si systemColorScheme === 'dark'
  const isDarkMode = theme === 'dark' || (theme === 'system' && isSystemDark);

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 