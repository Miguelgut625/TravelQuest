import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, Modal, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map from '../../components/maps';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import generateMission from '../../services/missionGenerator';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
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

<<<<<<< HEAD
=======
const DateRangePickerMobile: React.FC<{
  startDateProp: Date | null;
  endDateProp: Date | null;
  onDatesChange: (dates: [Date | null, Date | null]) => void;
}> = ({ startDateProp, endDateProp, onDatesChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{[date: string]: any}>({});

  useEffect(() => {
    setStartDate(startDateProp);
    setEndDate(endDateProp);
    
    if (startDateProp || endDateProp) {
      updateMarkedDates(startDateProp, endDateProp);
    }
  }, [startDateProp, endDateProp]);

  const updateMarkedDates = (start: Date | null, end: Date | null) => {
    const newMarkedDates: {[date: string]: any} = {};
    
    if (start) {
      const startStr = format(start, 'yyyy-MM-dd');
      newMarkedDates[startStr] = { 
        startingDay: true, 
        color: '#005F9E',
        textColor: 'white'
      };
    }
    
    if (end) {
      const endStr = format(end, 'yyyy-MM-dd');
      newMarkedDates[endStr] = { 
        endingDay: true, 
        color: '#005F9E',
        textColor: 'white'
      };
    }
    
    if (start && end) {
      let currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);
      
      while (currentDate < end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        newMarkedDates[dateStr] = { 
          color: '#e5f3ff',
          textColor: '#005F9E'
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    setSelectedDates(newMarkedDates);
  };

  const handleDayPress = (day: any) => {
    const selectedDate = new Date(day.dateString);
    
    if (!startDate || (startDate && endDate)) {
      const newStart = selectedDate;
      setStartDate(newStart);
      setEndDate(null);
      updateMarkedDates(newStart, null);
      onDatesChange([newStart, null]);
    } else {
      if (selectedDate < startDate) {
        const newEnd = new Date(startDate);
        setEndDate(newEnd);
        setStartDate(selectedDate);
        updateMarkedDates(selectedDate, newEnd);
        onDatesChange([selectedDate, newEnd]);
      } else {
        setEndDate(selectedDate);
        updateMarkedDates(startDate, selectedDate);
        onDatesChange([startDate, selectedDate]);
      }
    }
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
          <Calendar
            minDate={new Date().toISOString().split('T')[0]}
            onDayPress={handleDayPress}
            markingType="period"
            markedDates={selectedDates}
            theme={{
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#005F9E',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#005F9E',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#005F9E',
              selectedDotColor: '#ffffff',
              arrowColor: '#005F9E',
              monthTextColor: '#005F9E',
              indicatorColor: '#005F9E',
            }}
          />
        </View>
      )}
    </View>
  );
};

// En lugar de usar react-datepicker, crear un componente propio para web
const DateRangePickerWeb: React.FC<{
  startDateProp: Date | null;
  endDateProp: Date | null;
  onDatesChange: (dates: [Date | null, Date | null]) => void;
}> = ({ startDateProp, endDateProp, onDatesChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    setStartDate(startDateProp);
    setEndDate(endDateProp);
  }, [startDateProp, endDateProp]);
  
  // Función para generar el calendario
  const generateCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Obtener el primer día del mes
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = domingo
    
    // Obtener el último día del mes
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Crear un array para los días del mes
    const days = [];
    
    // Agregar días del mes anterior para completar la primera semana
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -i);
      days.unshift({
        date: prevMonthDay,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }
    
    // Agregar los días del mes actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= totalDays; i++) {
      const currentDate = new Date(year, month, i);
      currentDate.setHours(0, 0, 0, 0);
      
      const isToday = currentDate.getTime() === today.getTime();
      const isStartDate = startDate && currentDate.getTime() === new Date(startDate).setHours(0,0,0,0);
      const isEndDate = endDate && currentDate.getTime() === new Date(endDate).setHours(0,0,0,0);
      const isInRange = startDate && endDate && 
                        currentDate > new Date(startDate).setHours(0,0,0,0) && 
                        currentDate < new Date(endDate).setHours(0,0,0,0);
      
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday,
        isSelected: isStartDate || isEndDate,
        isStartDate,
        isEndDate,
        isInRange
      });
    }
    
    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextMonthDay = new Date(year, month + 1, i);
        days.push({
          date: nextMonthDay,
          isCurrentMonth: false,
          isToday: false,
          isSelected: false
        });
      }
    }
    
    return days;
  };
  
  const handleDateClick = (date: Date) => {
    // No permitir seleccionar fechas en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return;
    }
    
    if (!startDate || (startDate && endDate)) {
      // Si no hay fecha de inicio o ambas fechas están seleccionadas, establecer como nueva fecha de inicio
      setStartDate(date);
      setEndDate(null);
      onDatesChange([date, null]);
    } else {
      // Si solo hay fecha de inicio, establecer como fecha de fin
      if (date < startDate) {
        // Si la fecha seleccionada es anterior a la fecha de inicio, intercambiarlas
        setEndDate(new Date(startDate));
        setStartDate(date);
        onDatesChange([date, startDate]);
      } else {
        setEndDate(date);
        onDatesChange([startDate, date]);
      }
    }
  };
  
  const formatMonth = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  
  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };
  
  const days = generateCalendar(currentMonth);
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const calculateDuration = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return `${date.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][date.getMonth()]}`;
  };
  
  const formatDateRange = (): string => {
    if (!startDate && !endDate) {
      return 'Selecciona fechas';
    }
    
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const duration = calculateDuration(startDate, endDate);
    
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
    <div style={{ 
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          zIndex: 9999,
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          borderRadius: 8,
          marginTop: 4,
          padding: 15,
          width: 620,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center'
    }}>
      <button
                onClick={() => changeMonth(-1)}
        style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#005F9E'
                }}
              >
                &larr;
      </button>
              <h3 style={{
                margin: '0 15px',
                color: '#005F9E'
              }}>
                {formatMonth(currentMonth)}
              </h3>
              <button 
                onClick={() => changeMonth(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#005F9E'
                }}
              >
                &rarr;
              </button>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center'
            }}>
              <button 
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  onDatesChange([null, null]);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #ddd',
                  padding: '5px 10px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 5,
            textAlign: 'center'
          }}>
            {weekDays.map(day => (
              <div key={day} style={{
                padding: 5,
                fontWeight: 'bold',
                color: '#666'
              }}>
                {day}
              </div>
            ))}
            
            {days.map((day, index) => (
              <div 
                key={index}
                onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
          style={{
                  padding: 10,
                  cursor: day.isCurrentMonth ? 'pointer' : 'default',
                  backgroundColor: day.isStartDate || day.isEndDate 
                    ? '#005F9E' 
                    : day.isInRange 
                      ? '#e5f3ff' 
                      : 'transparent',
                  color: day.isStartDate || day.isEndDate 
                    ? 'white' 
                    : !day.isCurrentMonth 
                      ? '#ccc' 
                      : day.isToday 
                        ? '#005F9E' 
                        : '#333',
                  fontWeight: day.isToday ? 'bold' : 'normal',
                  borderRadius: 4,
                  opacity: day.isCurrentMonth ? 1 : 0.5
                }}
              >
                {day.date.getDate()}
        </div>
            ))}
    </div>
        </div>
      )}
    </View>
  );
};

>>>>>>> 3d2dca72 (diario y subida de imagenes)
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
  const [missionCount, setMissionCount] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
<<<<<<< HEAD
=======
  const [currentStep, setCurrentStep] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [errorLocationMsg, setErrorLocationMsg] = useState<string | null>(null);
>>>>>>> 3d2dca72 (diario y subida de imagenes)
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [duration, setDuration] = useState<number>(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
<<<<<<< HEAD
      console.log('Estado de los permisos:', status);
      setHasLocationPermission(status === 'granted');

=======
        
        console.log('Estado de permisos de ubicación:', status);
      
>>>>>>> 3d2dca72 (diario y subida de imagenes)
      if (status !== 'granted') {
          console.warn('Permiso de ubicación denegado');
          setErrorLocationMsg('Permiso de ubicación denegado');
          setIsLoadingLocation(false);
        return;
      }

<<<<<<< HEAD
      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setRegion(newRegion);
=======
      console.log('Obteniendo ubicación actual...');
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      console.log('Ubicación obtenida:', location);
      
>>>>>>> 3d2dca72 (diario y subida de imagenes)
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
        
        setIsLoadingLocation(false);
        setErrorLocationMsg(null);
    } catch (error) {
        console.error('Error al obtener la ubicación:', error);
        setErrorLocationMsg('Error al obtener la ubicación');
      setIsLoadingLocation(false);
    }
  };

    getLocation();
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

  const handleCitySelect = (city: City) => {
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
<<<<<<< HEAD
    const calculatedDuration = calculateDuration(startDate, endDate);
    setDuration(calculatedDuration);

    if (!searchCity || calculatedDuration <= 0 || !missionCountNum) {
      setErrorMsg('Por favor, completa todos los campos');
=======

    if (!duration || duration <= 0) {
      setErrorMsg('Por favor, selecciona fechas válidas para crear un viaje');
>>>>>>> 3d2dca72 (diario y subida de imagenes)
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('Selecciona fechas de inicio y fin');
      return;
    }

    try {
      const validStartDate = new Date(startDate.getTime());
      const validEndDate = new Date(endDate.getTime());

      if (validEndDate < validStartDate) {
        setErrorMsg('La fecha de fin no puede ser anterior a la fecha de inicio');
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      setCurrentStep('Preparando tu viaje a ' + searchCity.toUpperCase() + '...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep('Buscando lugares interesantes...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCurrentStep('Creando misiones emocionantes...');
      const result = await generateMission(
        searchCity.toUpperCase(),
        calculatedDuration,
        missionCountNum,
        user.id,
        validStartDate,
        validEndDate
      );

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

<<<<<<< HEAD
=======
  const onDatesChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    
    console.log('MapScreen - Fechas seleccionadas:', { start, end });
    
    setStartDate(start);
    setEndDate(end);
    
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const newDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log('Nueva duración calculada:', newDuration);
      setDuration(newDuration);
    } else {
      setDuration(0);
    }
  };

  // Elegir el componente correcto según la plataforma
  const DateRangePicker = Platform.OS === 'web' ? DateRangePickerWeb : DateRangePickerMobile;

>>>>>>> 3d2dca72 (diario y subida de imagenes)
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar ciudad"
          value={searchCity}
          onChangeText={handleCitySearch}
        />
        {showSuggestions && filteredCities.length > 0 && (
          <View style={styles.suggestionsList}>
            {filteredCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.suggestionItem}
                onPress={() => handleCitySelect(city)}
              >
                <Text style={styles.suggestionText}>{city.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Número de misiones"
          value={missionCount}
          onChangeText={setMissionCount}
          keyboardType="numeric"
        />
        
<<<<<<< HEAD
        {Platform.OS === 'web' ? (
          <View style={styles.dateRangeContainer}>
            <DatePicker
              selected={startDate}
              onChange={(dates) => {
                const [start, end] = dates;
                setStartDate(start);
                setEndDate(end);
                if (start && end) {
                  setDuration(calculateDuration(start, end));
                }
              }}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              monthsShown={2}
              minDate={new Date()}
              placeholderText="Selecciona fechas"
              className="booking-calendar"
            />
          </View>
        ) : (
          <View style={styles.datePickersRow}>
            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginRight: 5 }]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Inicio: {startDate?.toLocaleDateString() || 'Seleccionar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateButton, { flex: 1, marginLeft: 5 }]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                Fin: {endDate?.toLocaleDateString() || 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
=======
        <DateRangePicker
          startDateProp={startDate}
          endDateProp={endDate}
          onDatesChange={onDatesChange}
        />
>>>>>>> 3d2dca72 (diario y subida de imagenes)

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
            {errorLocationMsg && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setIsLoadingLocation(true);
                  setErrorLocationMsg(null);
                  (async () => {
                    try {
                      const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                      });
                      setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      });
                      setIsLoadingLocation(false);
                    } catch (error) {
                      console.error('Error al reintentar obtener ubicación:', error);
                      setErrorLocationMsg('Error al obtener la ubicación');
                      setIsLoadingLocation(false);
                    }
                  })();
                }}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Map
            region={{
              latitude: userLocation?.latitude || 40.416775,
              longitude: userLocation?.longitude || -3.703790,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            style={styles.map}
            showsUserLocation={true}
            userLocation={userLocation}
          />
        )}
      </View>
<<<<<<< HEAD

      <LoadingModal visible={isLoading} currentStep={currentStep} />
=======
>>>>>>> 3d2dca72 (diario y subida de imagenes)
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
<<<<<<< HEAD
=======
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
>>>>>>> 3d2dca72 (diario y subida de imagenes)
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
  errorOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 10,
    borderRadius: 5,
  },
});

export default MapScreen; 