import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, Modal, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map, { MapMarker } from '../../components/maps';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import generateMission from '../../services/missionGenerator';
import { Ionicons } from '@expo/vector-icons';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../../styles/datepicker.css';
import { searchCities } from '../../services/supabase';
import { format } from 'date-fns';

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

const DateRangePickerWeb: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleDatesChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const calculateDuration = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateRange = (): string => {
    if (!startDate && !endDate) {
      return 'Selecciona fechas';
    }
    
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return format(date, 'dd MMM');
    };

    const duration = calculateDuration(startDate, endDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    if (startStr && endStr) {
      return `${startStr} - ${endStr} · ${duration} noches`;
    } else if (startStr) {
      return `${startStr} - Selecciona fecha final`;
    } else {
      return 'Selecciona fechas';
    }
  };

  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={styles.datePickerContent}>
          <Text style={styles.datePickerText}>{formatDateRange()}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color="white" />
        </View>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.calendarDropdown}>
          <DatePicker
            selected={startDate}
            onChange={handleDatesChange}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            inline
            monthsShown={2}
            calendarClassName="booking-calendar"
            placeholderText="Selecciona fechas"
          />
        </View>
      )}
    </View>
  );
};

const MapScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [region, setRegion] = useState({
    latitude: 40.416775,
    longitude: -3.703790,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchCity, setSearchCity] = useState('');
  const [duration, setDuration] = useState('');
  const [missionCount, setMissionCount] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Se requiere permiso para acceder a la ubicación');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const calculateDuration = (start: Date | null, end: Date | null) => {
    if (!start || !end) return 0;
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

    const durationNum = parseInt(duration);
    const missionCountNum = parseInt(missionCount);

    if (!searchCity || !durationNum || !missionCountNum) {
      setErrorMsg('Por favor, completa todos los campos');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const result = await generateMission(searchCity, durationNum, missionCountNum, user.id);
      
      if (!result.journeyId) {
        throw new Error('No se recibió el ID del journey');
      }

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

  const handleDatesChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar ciudad"
          value={searchCity}
          onChangeText={setSearchCity}
        />
        <TextInput
          style={styles.input}
          placeholder="Duración (días)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Número de misiones"
          value={missionCount}
          onChangeText={setMissionCount}
          keyboardType="numeric"
        />
        
        {Platform.OS === 'web' ? (
          <DateRangePickerWeb />
        ) : (
          <View style={styles.datePickersRow}>
            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginRight: 5 }]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Inicio: {startDate?.toLocaleDateString() || ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginLeft: 5 }]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Fin: {endDate?.toLocaleDateString() || ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(showStartDatePicker || showEndDatePicker) && (
          <DatePicker
            selected={showStartDatePicker ? startDate : endDate}
            onChange={(date) => {
              if (Platform.OS === 'android') {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }
              if (date) {
                if (showStartDatePicker) {
                  setStartDate(date);
                } else {
                  setEndDate(date);
                }
              }
            }}
            minDate={new Date()}
            maxDate={new Date()}
            showTimeSelect={false}
            dateFormat="dd/MM/yyyy"
            className="booking-calendar"
            calendarClassName="booking-calendar"
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
        <Map
          region={region}
          style={styles.map}
          showsUserLocation={true}
          showsMyLocationButton={true}
        />
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
    zIndex: 9999,
    position: 'relative',
    overflow: 'visible'
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
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 9999,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    overflow: 'visible',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      }
    })
  },
  dateInputContainer: {
    width: '100%',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
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
    cursor: 'pointer',
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
  dateRangeContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  datePickerWrapper: {
    width: '100%',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    backgroundColor: '#005F9E',
    borderWidth: 1,
    borderColor: '#005F9E'
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 14,
    color: 'white',
  },
  calendarDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 9999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderRadius: 8,
    marginTop: 4,
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: 620,
        marginLeft: 'auto',
        marginRight: 'auto'
      }
    })
  },
});

export default MapScreen; 