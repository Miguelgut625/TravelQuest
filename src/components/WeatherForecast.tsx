import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Modal, TouchableOpacity, Image } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getForecastByCity, getForecastByCoordinates } from '../services/weatherService';

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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {cityName ? `Pronóstico para ${cityName}` : 'Pronóstico de 7 días'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#005F9E" />
                <Text style={styles.loadingText}>Cargando pronóstico...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={40} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadForecastData}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : forecastData ? (
              <View style={styles.forecastContainer}>
                {forecastData.daily.slice(0, 7).map((day, index) => (
                  <Card key={index} style={styles.forecastCard}>
                    <Card.Content>
                      <View style={styles.forecastDayHeader}>
                        <Text style={styles.forecastDay}>
                          {index === 0 ? 'Hoy' : getDayOfWeek(day.date)}
                        </Text>
                        <Text style={styles.forecastDate}>
                          {formatDate(day.date)}
                        </Text>
                      </View>
                      
                      <View style={styles.forecastRow}>
                        <View style={styles.forecastIconContainer}>
                          <Image 
                            source={{ uri: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png` }} 
                            style={styles.forecastIcon} 
                          />
                          <Text style={styles.forecastDescription}>
                            {day.weather[0].description}
                          </Text>
                        </View>
                        
                        <View style={styles.forecastTemps}>
                          <Text style={styles.forecastTempMax}>
                            <Ionicons name="arrow-up" size={16} color="#FF5722" />
                            {Math.round(day.temp.max)}°C
                          </Text>
                          <Text style={styles.forecastTempMin}>
                            <Ionicons name="arrow-down" size={16} color="#2196F3" />
                            {Math.round(day.temp.min)}°C
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.forecastDetails}>
                        <View style={styles.forecastDetailItem}>
                          <Ionicons name="water-outline" size={18} color="#005F9E" />
                          <Text style={styles.forecastDetailText}>{day.humidity}%</Text>
                        </View>
                        
                        <View style={styles.forecastDetailItem}>
                          <Ionicons name="umbrella-outline" size={18} color="#005F9E" />
                          <Text style={styles.forecastDetailText}>{Math.round(day.pop * 100)}%</Text>
                        </View>
                        
                        <View style={styles.forecastDetailItem}>
                          <Ionicons name="compass-outline" size={18} color="#005F9E" />
                          <Text style={styles.forecastDetailText}>{Math.round(day.speed * 3.6)} km/h</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No hay datos de pronóstico disponibles</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#005F9E',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  forecastContainer: {
    padding: 8,
  },
  forecastCard: {
    marginBottom: 10,
    elevation: 2,
  },
  forecastDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  forecastDate: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
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
    color: '#FF5722',
    marginBottom: 4,
  },
  forecastTempMin: {
    fontSize: 16,
    color: '#2196F3',
  },
  forecastDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
});

export default WeatherForecast; 