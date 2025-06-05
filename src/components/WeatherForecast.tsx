import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Modal, TouchableOpacity, Image } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getForecastByCity, getForecastByCoordinates } from '../services/weatherService';
import { colors, commonStyles, typography, spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

// API key de OpenWeatherMap
const OPENWEATHERMAP_API_KEY = Constants.expoConfig?.extra?.openWeatherMapApiKey || '7b4032296ff42f3251c5b97a5eff8ef7';

/**
 * Interfaz para un día del pronóstico
 */
interface ForecastDay {
  dt: number;
  date: Date;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  feels_like: {
    day: number;
  };
  pressure: number;
  humidity: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  speed: number;
  deg: number;
  clouds: number;
  pop: number;
  rain?: number;
}

/**
 * Interfaz para los datos del pronóstico de 7 días
 */
interface ForecastData {
  lat: number;
  lon: number;
  timezone: number;
  timezone_offset: number;
  city_name: string;
  country: string;
  daily: ForecastDay[];
}

interface WeatherForecastProps {
  visible: boolean;
  onClose: () => void;
  cityName?: string;
  latitude?: number;
  longitude?: number;
}

const WeatherForecast = ({ visible, onClose, cityName, latitude, longitude }: WeatherForecastProps) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, colors } = useTheme();

  // Función para obtener los datos del pronóstico
  const loadForecastData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verificar la API key
      if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY === 'TU_API_KEY_AQUI') {
        setError('API Key de OpenWeatherMap no configurada');
        setIsLoading(false);
        return;
      }

      let forecastResponse;

      // Obtener pronóstico por nombre de ciudad o coordenadas
      if (cityName) {
        forecastResponse = await getForecastByCity(cityName, OPENWEATHERMAP_API_KEY);
      } else if (latitude !== undefined && longitude !== undefined) {
        forecastResponse = await getForecastByCoordinates(latitude, longitude, OPENWEATHERMAP_API_KEY);
      } else {
        // Intentar usar la ubicación actual
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permiso para acceder a la ubicación denegado');
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        forecastResponse = await getForecastByCoordinates(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHERMAP_API_KEY
        );
      }

      setForecastData(forecastResponse);
    } catch (error) {
      console.error('Error cargando pronóstico:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al mostrar el modal
  useEffect(() => {
    if (visible) {
      loadForecastData();
    }
  }, [visible, cityName, latitude, longitude]);

  // Función para convertir timestamp a día de la semana
  const getDayOfWeek = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  // Función para formatear fecha completa
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });
  };

  // Estilos adaptados a modo oscuro
  const dynamicStyles = StyleSheet.create({
    modalOverlay: {
      ...commonStyles.modalOverlay,
      backgroundColor: isDarkMode ? 'rgba(10,16,30,0.85)' : 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      ...commonStyles.modalContent,
      backgroundColor: isDarkMode ? (colors.background || '#181C22') : '#fff',
    },
    modalHeader: {
      ...commonStyles.modalHeader,
      backgroundColor: isDarkMode ? (colors.background || '#181C22') : '#fff',
      borderBottomColor: isDarkMode ? '#232A36' : '#eee',
    },
    modalTitle: {
      ...typography.h3,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    modalBody: {
      ...commonStyles.modalBody,
      backgroundColor: isDarkMode ? (colors.background || '#181C22') : '#fff',
    },
    loadingContainer: {
      ...commonStyles.loadingContainer,
    },
    loadingText: {
      ...typography.body,
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
      marginTop: spacing.sm,
    },
    errorContainer: {
      ...commonStyles.errorContainer,
      backgroundColor: isDarkMode ? '#181C22' : '#fff',
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    retryButton: {
      ...commonStyles.button,
      marginTop: spacing.md,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
    },
    retryButtonText: {
      ...commonStyles.buttonText,
      color: isDarkMode ? '#181C22' : '#fff',
    },
    forecastContainer: {
      padding: spacing.sm,
    },
    forecastCard: {
      ...commonStyles.card,
      marginBottom: spacing.sm,
      backgroundColor: isDarkMode ? '#232A36' : '#fff',
    },
    forecastDayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    forecastDay: {
      ...typography.h3,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    forecastDate: {
      ...typography.small,
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
    },
    forecastRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    forecastIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 2,
    },
    forecastIcon: {
      width: 50,
      height: 50,
    },
    forecastDescription: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
      textTransform: 'capitalize',
      flex: 1,
      flexWrap: 'wrap',
    },
    forecastTemps: {
      alignItems: 'flex-end',
      flex: 1,
    },
    forecastTempMax: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#FF5722',
      marginBottom: 4,
    },
    forecastTempMin: {
      fontSize: 16,
      color: isDarkMode ? colors.text.secondary : '#2196F3',
    },
    forecastDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDarkMode ? '#181C22' : '#f5f5f5',
      borderRadius: 8,
      padding: 8,
    },
    forecastDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 5,
    },
    forecastDetailText: {
      marginLeft: 4,
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>
              {cityName ? `Pronóstico para ${cityName}` : 'Pronóstico de 7 días'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDarkMode ? colors.text.primary : "#333"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={dynamicStyles.modalBody}>
            {isLoading ? (
              <View style={dynamicStyles.loadingContainer}>
                <ActivityIndicator size="large" color={isDarkMode ? colors.accent : "#005F9E"} />
                <Text style={dynamicStyles.loadingText}>Cargando pronóstico...</Text>
              </View>
            ) : error ? (
              <View style={dynamicStyles.errorContainer}>
                <Ionicons name="alert-circle" size={40} color={colors.error} />
                <Text style={dynamicStyles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={dynamicStyles.retryButton}
                  onPress={loadForecastData}
                >
                  <Text style={dynamicStyles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : forecastData ? (
              <View style={dynamicStyles.forecastContainer}>
                {forecastData.daily.slice(0, 7).map((day, index) => (
                  <Card key={index} style={dynamicStyles.forecastCard}>
                    <Card.Content>
                      <View style={dynamicStyles.forecastDayHeader}>
                        <Text style={dynamicStyles.forecastDay}>
                          {index === 0 ? 'Hoy' : getDayOfWeek(day.date)}
                        </Text>
                        <Text style={dynamicStyles.forecastDate}>
                          {formatDate(day.date)}
                        </Text>
                      </View>

                      <View style={dynamicStyles.forecastRow}>
                        <View style={dynamicStyles.forecastIconContainer}>
                          <Image
                            source={{ uri: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png` }}
                            style={dynamicStyles.forecastIcon}
                          />
                          <Text style={dynamicStyles.forecastDescription}>
                            {day.weather[0].description}
                          </Text>
                        </View>

                        <View style={dynamicStyles.forecastTemps}>
                          <Text style={dynamicStyles.forecastTempMax}>
                            <Ionicons name="arrow-up" size={16} color={isDarkMode ? colors.accent : "#FF5722"} />
                            {Math.round(day.temp.max)}°C
                          </Text>
                          <Text style={dynamicStyles.forecastTempMin}>
                            <Ionicons name="arrow-down" size={16} color={isDarkMode ? colors.text.secondary : "#2196F3"} />
                            {Math.round(day.temp.min)}°C
                          </Text>
                        </View>
                      </View>

                      <View style={dynamicStyles.forecastDetails}>
                        <View style={dynamicStyles.forecastDetailItem}>
                          <Ionicons name="water-outline" size={18} color={isDarkMode ? colors.accent : "#005F9E"} />
                          <Text style={dynamicStyles.forecastDetailText}>{day.humidity}%</Text>
                        </View>

                        <View style={dynamicStyles.forecastDetailItem}>
                          <Ionicons name="umbrella-outline" size={18} color={isDarkMode ? colors.accent : "#005F9E"} />
                          <Text style={dynamicStyles.forecastDetailText}>{Math.round(day.pop * 100)}%</Text>
                        </View>

                        <View style={dynamicStyles.forecastDetailItem}>
                          <Ionicons name="compass-outline" size={18} color={isDarkMode ? colors.accent : "#005F9E"} />
                          <Text style={dynamicStyles.forecastDetailText}>{Math.round(day.speed * 3.6)} km/h</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={dynamicStyles.errorContainer}>
                <Text style={dynamicStyles.errorText}>No hay datos de pronóstico disponibles</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default WeatherForecast; 