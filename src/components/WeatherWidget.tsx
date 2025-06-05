import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getWeatherByCity, getWeatherByCoordinates } from '../services/weatherService';
import WeatherForecast from './WeatherForecast';
import { useTheme } from '../context/ThemeContext';

// API key de OpenWeatherMap
const OPENWEATHERMAP_API_KEY = Constants.expoConfig?.extra?.openWeatherMapApiKey || '7b4032296ff42f3251c5b97a5eff8ef7';

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
  sys: {
    country: string;
  };
  coord?: {
    lat: number;
    lon: number;
  };
}

interface WeatherWidgetProps {
  cityName?: string;
  latitude?: number;
  longitude?: number;
  compact?: boolean;
}

const WeatherWidget = ({ cityName, latitude, longitude, compact = false }: WeatherWidgetProps) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const { isDarkMode, colors } = useTheme();

  // Estilos dinámicos según el modo
  const dynamicStyles = StyleSheet.create({
    card: {
      borderRadius: 10,
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      backgroundColor: isDarkMode ? colors.surface : '#fff',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
    errorContainer: {
      padding: 20,
      alignItems: 'center',
    },
    errorText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 15,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    retryButtonText: {
      color: isDarkMode ? '#181C22' : 'white',
      fontWeight: 'bold',
    },
    weatherHeader: {
      alignItems: 'center',
      marginBottom: 15,
    },
    locationName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    mainWeatherInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    temperatureContainer: {
      flex: 1,
    },
    temperature: {
      fontSize: 40,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
    },
    feelsLike: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
    weatherIconContainer: {
      alignItems: 'center',
    },
    weatherIcon: {
      width: 80,
      height: 80,
    },
    weatherDescription: {
      fontSize: 16,
      color: isDarkMode ? colors.text.primary : colors.text.primary,
      textTransform: 'capitalize',
      textAlign: 'center',
    },
    weatherDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 15,
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
      borderRadius: 8,
      padding: 10,
    },
    detailItem: {
      alignItems: 'center',
      flex: 1,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.primary : colors.text.primary,
      marginTop: 5,
    },
    detailLabel: {
      fontSize: 12,
      color: isDarkMode ? colors.text.secondary : '#666',
      marginTop: 2,
    },
    forecastButton: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 5,
      marginTop: 10,
    },
    forecastButtonText: {
      color: isDarkMode ? '#181C22' : 'white',
      fontWeight: 'bold',
      marginRight: 5,
    },
    // Compacta
    compactCard: {
      borderRadius: 8,
      elevation: 2,
      margin: 0,
      padding: 0,
      height: 40,
      overflow: 'hidden',
      backgroundColor: isDarkMode ? colors.surface : '#fff',
    },
    compactCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 8,
      height: '100%',
    },
    compactLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactErrorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactErrorText: {
      fontSize: 12,
      color: colors.error,
    },
    compactWeatherInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    compactTemperature: {
      fontSize: 16,
      fontWeight: 'bold',
      marginRight: 8,
      color: isDarkMode ? colors.accent : colors.primary,
    },
    compactLocation: {
      fontSize: 12,
      color: isDarkMode ? colors.text.secondary : '#666',
      maxWidth: 80,
    },
    compactIcon: {
      width: 30,
      height: 30,
    },
  });

  // Función para cargar los datos del clima
  const loadWeatherData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verificar la API key
      if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY === 'TU_API_KEY_AQUI') {
        setError('API Key de OpenWeatherMap no configurada');
        setIsLoading(false);
        return;
      }

      let weatherResponse;

      // Obtener clima por nombre de ciudad o coordenadas
      if (cityName) {
        weatherResponse = await getWeatherByCity(cityName, OPENWEATHERMAP_API_KEY);
      } else if (latitude !== undefined && longitude !== undefined) {
        weatherResponse = await getWeatherByCoordinates(latitude, longitude, OPENWEATHERMAP_API_KEY);
      } else {
        // Intentar usar la ubicación actual
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permiso para acceder a la ubicación denegado');
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        weatherResponse = await getWeatherByCoordinates(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHERMAP_API_KEY
        );
      }

      setWeatherData(weatherResponse);
    } catch (error) {
      console.error('Error cargando datos del clima:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al montar el componente o cuando cambien las props
  useEffect(() => {
    loadWeatherData();
  }, [cityName, latitude, longitude]);

  // Vista compacta
  if (compact) {
    return (
      <>
        <Card style={dynamicStyles.compactCard}>
          {isLoading ? (
            <View style={dynamicStyles.compactLoadingContainer}>
              <ActivityIndicator size="small" color="#005F9E" />
            </View>
          ) : error ? (
            <View style={dynamicStyles.compactErrorContainer}>
              <Ionicons name="alert-circle" size={16} color="#D32F2F" />
            </View>
          ) : weatherData ? (
            <TouchableOpacity
              style={dynamicStyles.compactCardContent}
              onPress={() => setShowForecast(true)}
            >
              <View style={dynamicStyles.compactWeatherInfo}>
                <Text style={dynamicStyles.compactTemperature}>
                  {Math.round(weatherData.main.temp)}°C
                </Text>
                <Text style={dynamicStyles.compactLocation} numberOfLines={1}>
                  {weatherData.name}
                </Text>
              </View>
              {weatherData.weather[0].icon && (
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png` }}
                  style={dynamicStyles.compactIcon}
                />
              )}
            </TouchableOpacity>
          ) : (
            <View style={dynamicStyles.compactErrorContainer}>
              <Text style={dynamicStyles.compactErrorText}>N/D</Text>
            </View>
          )}
        </Card>

        <WeatherForecast
          visible={showForecast}
          onClose={() => setShowForecast(false)}
          cityName={cityName}
          latitude={latitude}
          longitude={longitude}
        />
      </>
    );
  }

  // Vista completa
  return (
    <>
      <Card style={dynamicStyles.card}>
        <Card.Content>
          {isLoading ? (
            <View style={dynamicStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={dynamicStyles.loadingText}>Cargando información del clima...</Text>
            </View>
          ) : error ? (
            <View style={dynamicStyles.errorContainer}>
              <Ionicons name="alert-circle" size={40} color="#D32F2F" />
              <Text style={dynamicStyles.errorText}>{error}</Text>
              <TouchableOpacity
                style={dynamicStyles.retryButton}
                onPress={loadWeatherData}
              >
                <Text style={dynamicStyles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : weatherData ? (
            <>
              <View style={dynamicStyles.weatherHeader}>
                <Text style={dynamicStyles.locationName}>
                  {weatherData.name}{weatherData.sys?.country ? `, ${weatherData.sys.country}` : ''}
                </Text>
              </View>

              <View style={dynamicStyles.mainWeatherInfo}>
                <View style={dynamicStyles.temperatureContainer}>
                  <Text style={dynamicStyles.temperature}>{Math.round(weatherData.main.temp)}°C</Text>
                  <Text style={dynamicStyles.feelsLike}>
                    Sensación térmica: {Math.round(weatherData.main.feels_like)}°C
                  </Text>
                </View>

                <View style={dynamicStyles.weatherIconContainer}>
                  {weatherData.weather[0].icon && (
                    <Image
                      source={{ uri: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png` }}
                      style={dynamicStyles.weatherIcon}
                    />
                  )}
                  <Text style={dynamicStyles.weatherDescription}>
                    {weatherData.weather[0].description}
                  </Text>
                </View>
              </View>

              <View style={dynamicStyles.weatherDetails}>
                <View style={dynamicStyles.detailItem}>
                  <Ionicons name="water-outline" size={22} color="#005F9E" />
                  <Text style={dynamicStyles.detailValue}>{weatherData.main.humidity}%</Text>
                  <Text style={dynamicStyles.detailLabel}>Humedad</Text>
                </View>

                <View style={dynamicStyles.detailItem}>
                  <Ionicons name="speedometer-outline" size={22} color="#005F9E" />
                  <Text style={dynamicStyles.detailValue}>{weatherData.main.pressure} hPa</Text>
                  <Text style={dynamicStyles.detailLabel}>Presión</Text>
                </View>

                <View style={dynamicStyles.detailItem}>
                  <Ionicons name="compass-outline" size={22} color="#005F9E" />
                  <Text style={dynamicStyles.detailValue}>{Math.round(weatherData.wind.speed * 3.6)} km/h</Text>
                  <Text style={dynamicStyles.detailLabel}>Viento</Text>
                </View>
              </View>

              <TouchableOpacity
                style={dynamicStyles.forecastButton}
                onPress={() => setShowForecast(true)}
              >
                <Text style={dynamicStyles.forecastButtonText}>
                  Ver pronóstico de 7 días
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>No hay datos del clima disponibles</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <WeatherForecast
        visible={showForecast}
        onClose={() => setShowForecast(false)}
        cityName={cityName}
        latitude={latitude}
        longitude={longitude}
      />
    </>
  );
};

export default WeatherWidget; 