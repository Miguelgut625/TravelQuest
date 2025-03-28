import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Platform, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map, { MapMarker } from '../../components/maps/index';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import generateMission from '../../services/missionGenerator';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { searchCities } from '../../services/supabase';

interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

type RootStackParamList = {
  Missions: {
    journeyId: string;
    challenges: any[];
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const LoadingModal = ({ visible, currentStep }: { visible: boolean; currentStep: string }) => (
  <Modal
    transparent={true}
    visible={visible}
    animationType="fade"
  >
    <View style={styles.modalContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingTitle}>Generando tu aventura</Text>
        <Text style={styles.loadingStep}>{currentStep}</Text>
      </View>
    </View>
  </Modal>
);

const DatePickerWeb = ({ 
  value, 
  onChange, 
  minDate, 
  label 
}: { 
  value: Date; 
  onChange: (date: Date) => void; 
  minDate?: Date;
  label: string;
}) => {
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(new Date(e.target.value));
    }
  };

  return (
    <View style={styles.dateInputContainer}>
      <Text style={styles.dateLabel}>{label}</Text>
      <input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleChange}
        min={minDate ? formatDateForInput(minDate) : undefined}
        style={styles.dateInput}
      />
    </View>
  );
};


const MapScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [region, setRegion] = useState({
    latitude: 38.3452,
    longitude: -0.4815,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchCity, setSearchCity] = useState('');
  const [missionCount, setMissionCount] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const getLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('Solicitando permisos de ubicación...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Estado de los permisos:', status);
      setHasLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.log('Permisos denegados');
        setErrorMsg('Se requiere permiso para acceder a la ubicación');
        return;
      }

      console.log('Obteniendo ubicación actual...');
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        mayShowUserSettingsDialog: true
      });
      
      console.log('Ubicación obtenida:', location);
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      setRegion(newRegion);
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error obteniendo la ubicación:', error);
      setErrorMsg('Error al obtener la ubicación. Por favor, verifica que el GPS esté activado.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  const calculateDuration = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCitySearch = async (text: string) => {
    const upperText = text.toUpperCase();
    setSearchCity(upperText);
    
    if (text.length > 2) {
      try {
        const cities = await searchCities(upperText);
        setFilteredCities(cities);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching cities:', error);
        setFilteredCities([]);
      }
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  };

  const handleCitySelect = (city: any) => {
    setSearchCity(city.name.toUpperCase());
    setShowSuggestions(false);
    setRegion({
      latitude: city.latitude,
      longitude: city.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  const handleSearch = async () => {
    if (!user?.id) {
      setErrorMsg('Debes iniciar sesión para generar misiones');
      return;
    }

    const missionCountNum = parseInt(missionCount);
    const duration = calculateDuration(startDate, endDate);
    const upperSearchCity = searchCity.toUpperCase();

    if (!upperSearchCity || !missionCountNum) {
      setErrorMsg('Por favor, completa todos los campos');
      return;
    }

    if (endDate < startDate) {
      setErrorMsg('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      setCurrentStep('Preparando tu viaje a ' + upperSearchCity + '...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep('Buscando lugares interesantes...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCurrentStep('Creando misiones emocionantes...');
      const result = await generateMission(upperSearchCity, duration, missionCountNum, user.id, startDate, endDate);
      
      if (!result.journeyId) {
        throw new Error('No se recibió el ID del journey');
      }

      setCurrentStep('¡Todo listo para tu aventura!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      navigation.navigate('Missions', {
        journeyId: result.journeyId,
        challenges: result.challenges || []
      });
    } catch (error) {
      console.error('Error generando misiones:', error);
      setErrorMsg('Error al generar las misiones. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <LoadingModal visible={isLoading} currentStep={currentStep} />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Buscar ciudad"
            value={searchCity}
            onChangeText={handleCitySearch}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && filteredCities.length > 0 && (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleCitySelect(item)}
                >
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
            />
          )}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Número de misiones"
          value={missionCount}
          onChangeText={setMissionCount}
          keyboardType="numeric"
        />
        
        {Platform.OS === 'web' ? (
          <View style={styles.datePickersRow}>
            <View style={styles.datePickerContainer}>
              <DatePickerWeb
                value={startDate}
                onChange={setStartDate}
                minDate={new Date()}
                label="Fecha de inicio"
              />
            </View>
            <View style={styles.datePickerContainer}>
              <DatePickerWeb
                value={endDate}
                onChange={setEndDate}
                minDate={startDate}
                label="Fecha de fin"
              />
            </View>
          </View>
        ) : (
          <View style={styles.datePickersRow}>
            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginRight: 5 }]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Inicio: {startDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginLeft: 5 }]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Fin: {endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(showStartDatePicker || showEndDatePicker) && (
          <DateTimePicker
            value={showStartDatePicker ? startDate : endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={showStartDatePicker ? onStartDateChange : onEndDateChange}
            minimumDate={showStartDatePicker ? new Date() : startDate}
          />
        )}

        <Text style={styles.durationText}>
          Duración del viaje: {calculateDuration(startDate, endDate)} días
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Generando...' : 'Buscar Aventuras'}
          </Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
            {errorMsg ? (
              <TouchableOpacity style={styles.retryButton} onPress={getLocation}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Map
            region={region}
            style={styles.map}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={hasLocationPermission}
            userLocation={userLocation}
            onRegionChangeComplete={(newRegion) => {
              setRegion(newRegion);
            }}
          />
        )}
        {errorMsg ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingStep: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  datePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  datePickerContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateInput: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  dateButtonText: {
    color: '#333',
    textAlign: 'center',
  },
  durationText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 10,
    borderRadius: 5,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  searchInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 5,
    maxHeight: 200,
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default MapScreen; 