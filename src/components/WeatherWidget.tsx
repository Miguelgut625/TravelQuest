import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getWeatherByCity, getWeatherByCoordinates } from '../services/weatherService';
import WeatherForecast from './WeatherForecast';

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

  // Ref para cancelar requests en cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Función para cargar los datos del clima con timeout
  const loadWeatherData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Crear nuevo abort controller
      abortControllerRef.current = new AbortController();
      
      // Verificar la API key
      if (!OPENWEATHERMAP_API_KEY || OPENWEATHERMAP_API_KEY === 'TU_API_KEY_AQUI') {
        if (isMountedRef.current) {
        setError('API Key de OpenWeatherMap no configurada');
        setIsLoading(false);
        }
        return;
      }
      
      let weatherResponse;
      
      // Promise race para timeout
      const weatherPromise = (async () => {
      // Obtener clima por nombre de ciudad o coordenadas
      if (cityName) {
          return await getWeatherByCity(cityName, OPENWEATHERMAP_API_KEY);
      } else if (latitude !== undefined && longitude !== undefined) {
          return await getWeatherByCoordinates(latitude, longitude, OPENWEATHERMAP_API_KEY);
      } else {
          // Intentar usar la ubicación actual con timeout
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permiso para acceder a la ubicación denegado');
          }
          
          // Timeout para getCurrentPositionAsync en iOS
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 1000
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 10000)
          );
          
          const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
          return await getWeatherByCoordinates(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHERMAP_API_KEY
        );
      }
      })();
      
      // Timeout para weather request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout obteniendo datos del clima')), 15000)
      );
      
      weatherResponse = await Promise.race([weatherPromise, timeoutPromise]);
      
      if (isMountedRef.current) {
        setWeatherData(weatherResponse as WeatherData);
      }
    } catch (error: any) {
      console.error('Error cargando datos del clima:', error);
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        // Mostrar error más amigable para usuarios
        let errorMessage = 'Error cargando el clima';
        if (error.message?.includes('Timeout')) {
          errorMessage = 'Timeout - Verifica tu conexión';
        } else if (error.message?.includes('ubicación')) {
          errorMessage = 'No se pudo obtener la ubicación';
        } else if (error.message?.includes('API')) {
          errorMessage = 'Servicio temporalmente no disponible';
        }
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
      setIsLoading(false);
      }
    }
  };

  // Cargar datos al montar el componente o cuando cambien las props
  useEffect(() => {
    isMountedRef.current = true;
    loadWeatherData();
    
    return () => {
      // Cleanup: cancelar requests y marcar como unmounted
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cityName, latitude, longitude]); // Dependencias específicas

  // Cleanup cuando el componente se desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Vista compacta
  if (compact) {
    return (
      <>
        <Card style={styles.compactCard}>
          {isLoading ? (
            <View style={styles.compactLoadingContainer}>
              <ActivityIndicator size="small" color="#005F9E" />
            </View>
          ) : error ? (
            <View style={styles.compactErrorContainer}>
              <Ionicons name="alert-circle" size={16} color="#D32F2F" />
            </View>
          ) : weatherData ? (
            <TouchableOpacity 
              style={styles.compactCardContent}
              onPress={() => setShowForecast(true)}
            >
              <View style={styles.compactWeatherInfo}>
                <Text style={styles.compactTemperature}>
                  {Math.round(weatherData.main.temp)}°C
                </Text>
                <Text style={styles.compactLocation} numberOfLines={1}>
                  {weatherData.name}
                </Text>
              </View>
              {weatherData.weather[0].icon && (
                <Image 
                  source={{ uri: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png` }} 
                  style={styles.compactIcon} 
                />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.compactErrorContainer}>
              <Text style={styles.compactErrorText}>N/D</Text>
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
      <Card style={styles.card}>
        <Card.Content>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={styles.loadingText}>Cargando información del clima...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={40} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={loadWeatherData}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : weatherData ? (
            <>
              <View style={styles.weatherHeader}>
                <Text style={styles.locationName}>
                  {weatherData.name}{weatherData.sys?.country ? `, ${weatherData.sys.country}` : ''}
                </Text>
              </View>

              <View style={styles.mainWeatherInfo}>
                <View style={styles.temperatureContainer}>
                  <Text style={styles.temperature}>{Math.round(weatherData.main.temp)}°C</Text>
                  <Text style={styles.feelsLike}>
                    Sensación térmica: {Math.round(weatherData.main.feels_like)}°C
                  </Text>
                </View>
                
                <View style={styles.weatherIconContainer}>
                  {weatherData.weather[0].icon && (
                    <Image 
                      source={{ uri: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png` }} 
                      style={styles.weatherIcon} 
                    />
                  )}
                  <Text style={styles.weatherDescription}>
                    {weatherData.weather[0].description}
                  </Text>
                </View>
              </View>

              <View style={styles.weatherDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="water" size={20} color="#003366" />
                  <Text style={styles.detailLabel}>Humedad</Text>
                  <Text style={styles.detailValue}>{weatherData.main.humidity}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer" size={20} color="#003366" />
                  <Text style={styles.detailLabel}>Presión</Text>
                  <Text style={styles.detailValue}>{weatherData.main.pressure} hPa</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="flag" size={20} color="#003366" />
                  <Text style={styles.detailLabel}>Viento</Text>
                  <Text style={styles.detailValue}>{weatherData.wind.speed}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.forecastButton}
                onPress={() => setShowForecast(true)}
              >
                <Text style={styles.forecastButtonText}>
                  Ver pronóstico de 7 días
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No hay datos del clima disponibles</Text>
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

const styles = StyleSheet.create({
  // Estilos para vista completa
  card: {
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#003366',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  weatherHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#003366',
  },
  feelsLike: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    marginTop: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  forecastButton: {
    backgroundColor: '#003366',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  forecastButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 5,
  },
  
  // Estilos para vista compacta
  compactCard: {
    borderRadius: 8,
    elevation: 2,
    margin: 0,
    padding: 0,
    height: 40,
    overflow: 'hidden',
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
    color: '#D32F2F',
  },
  compactWeatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTemperature: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  compactLocation: {
    fontSize: 12,
    color: '#666',
    maxWidth: 80,
  },
  compactIcon: {
    width: 30,
    height: 30,
  },
});

export default WeatherWidget; 