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
import GlobeView from '../../components/GlobeView';

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
        
        {/* Indicador de progreso visual */}
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill, 
            { 
              width: currentStep.includes('Preparando') ? '30%' : 
                    currentStep.includes('Buscando') ? '60%' : 
                    currentStep.includes('Creando') ? '90%' : '10%' 
            }
          ]} />
        </View>
      </View>
    </View>
  </Modal>
);

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
                        currentDate.getTime() > new Date(startDate).setHours(0,0,0,0) && 
                        currentDate.getTime() < new Date(endDate).setHours(0,0,0,0);
      
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

const MapScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [region, setRegion] = useState({
    latitude: 40.416775, // Madrid por defecto
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
  const [currentStep, setCurrentStep] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false); // Cambiado a false para mostrar el mapa inmediatamente
  const [errorLocationMsg, setErrorLocationMsg] = useState<string | null>(null);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 40.416775, // Madrid por defecto
    longitude: -3.703790,
  });
  // Añadir estado para los tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Definir los tags disponibles
  const availableTags = [
    { id: 'gratis', label: 'Gratuito' },
    { id: 'naturaleza', label: 'Naturaleza' },
    { id: 'arquitectura', label: 'Arquitectura' },
    { id: 'arte', label: 'Arte' },
    { id: 'cultura', label: 'Cultura' },
    { id: 'gastronomia', label: 'Gastronomía' },
    { id: 'historia', label: 'Historia' },
    { id: 'deportes', label: 'Deportes' },
    { id: 'compras', label: 'Compras' },
    { id: 'familia', label: 'Familiar' },
  ];

  // Función para seleccionar o deseleccionar un tag
  const toggleTag = (tagId: string) => {
    setSelectedTags(prevTags => 
      prevTags.includes(tagId)
        ? prevTags.filter(id => id !== tagId)
        : [...prevTags, tagId]
    );
  };

  useEffect(() => {
    // Iniciar la obtención de la ubicación en segundo plano
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      console.log('Solicitando permisos de ubicación en segundo plano...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Estado de permisos de ubicación:', status);
      
      if (status !== 'granted') {
        console.warn('Permiso de ubicación denegado');
        setErrorLocationMsg('Permiso de ubicación denegado. Usando ubicación por defecto.');
        return;
      }

      console.log('Permisos concedidos, obteniendo ubicación actual...');
      
      // Configurar opciones para obtener la ubicación
      const options = Platform.OS === 'android' ? {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10,
        mayShowUserSettingsDialog: true,
      } : {
        accuracy: Location.Accuracy.Balanced
      };
      
      console.log('Usando opciones de ubicación:', JSON.stringify(options));
      
      try {
        console.log('Intentando obtener ubicación...');
        let location = await Location.getCurrentPositionAsync(options);
        console.log('Ubicación obtenida:', JSON.stringify(location.coords));
        
        // Actualizar estado con la ubicación obtenida
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        // Actualizar el estado de la región del mapa
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (locationError: any) {
        console.error('Error específico al obtener ubicación:', locationError);
        
        // Intentar con el método getLastKnownPositionAsync como fallback
        console.log('Intentando obtener última ubicación conocida...');
        try {
          const lastLocation = await Location.getLastKnownPositionAsync();
          if (lastLocation) {
            console.log('Última ubicación conocida:', JSON.stringify(lastLocation.coords));
            setUserLocation({
              latitude: lastLocation.coords.latitude,
              longitude: lastLocation.coords.longitude,
            });
            
            setRegion({
              latitude: lastLocation.coords.latitude,
              longitude: lastLocation.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            return;
          }
        } catch (lastLocError) {
          console.error('Error al obtener última ubicación conocida:', lastLocError);
        }
        
        // No lanzamos error, simplemente dejamos la ubicación por defecto
        setErrorLocationMsg(`No se pudo obtener tu ubicación. Usando ubicación por defecto.`);
      }
    } catch (error: any) {
      console.error('Error al obtener la ubicación:', error);
      setErrorLocationMsg(`Error al obtener la ubicación: ${error.message}. Usando ubicación por defecto.`);
    }
  };

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

    const missionCountNum = parseInt(missionCount) || 3; // Usar 3 como valor por defecto si no hay número

    if (!duration || duration <= 0) {
      setErrorMsg('Por favor, selecciona fechas válidas para crear un viaje');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('Selecciona fechas de inicio y fin');
      return;
    }

    if (!searchCity) {
      setErrorMsg('Por favor, ingresa una ciudad de destino');
      return;
    }

    try {
      const validStartDate = new Date(startDate.getTime());
      const validEndDate = new Date(endDate.getTime());

      if (validEndDate < validStartDate) {
        setErrorMsg('La fecha de fin no puede ser anterior a la fecha de inicio');
        return;
      }

      // Iniciar el proceso de generación
      setIsLoading(true);
      setErrorMsg(null);

      // Paso 1: Preparando el viaje
      setCurrentStep(`Preparando tu viaje a ${searchCity}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Paso 2: Buscando lugares
      setCurrentStep(`Buscando lugares interesantes en ${searchCity}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Paso 3: Creando misiones
      setCurrentStep(`Creando ${missionCountNum} misiones emocionantes...`);
      
      // Obtener la ciudad seleccionada del filtro de ciudades
      let selectedCity = filteredCities.find(city => city.name.toUpperCase() === searchCity);
      
      // Si no se encuentra una coincidencia exacta, usar la ciudad escrita por el usuario
      const cityName = selectedCity ? selectedCity.name : searchCity;
      
      // Llamar a la API para generar las misiones con el nombre real de la ciudad
      const result = await generateMission(
        cityName,
        duration,
        missionCountNum,
        user.id,
        validStartDate,
        validEndDate,
        selectedTags // Pasar los tags seleccionados
      );
      
      if (!result.journeyId) {
        throw new Error('No se recibió el ID del journey');
      }

      // Paso final: Completado
      setCurrentStep('¡Aventura generada con éxito!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navegar a la pantalla de misiones
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
        
        <DateRangePicker
          startDateProp={startDate}
          endDateProp={endDate}
          onDatesChange={onDatesChange}
        />

        <Text style={styles.durationText}>
          Duración del viaje: {calculateDuration(startDate, endDate)} días
        </Text>

        {/* Sección de etiquetas */}
        <Text style={styles.tagsTitle}>Preferencias de viaje:</Text>
        <View style={styles.tagsContainer}>
          {availableTags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagButton,
                selectedTags.includes(tag.id) && styles.tagButtonSelected
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedTags.includes(tag.id) && styles.tagTextSelected
                ]}
              >
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
        <View style={{ flex: 1, width: '100%' }}>
          {errorLocationMsg && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorText}>{errorLocationMsg}</Text>
            </View>
          )}
          <GlobeView style={styles.map} />
        </View>
      </View>

      <LoadingModal visible={isLoading} currentStep={currentStep} />
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
    backgroundColor: '#005F9E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#78909C',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#D32F2F',
    marginTop: 10,
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
  datePickerButton: {
    backgroundColor: '#005F9E',
    borderRadius: 8,
    padding: 12,
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    color: 'white',
    fontSize: 16,
  },
  calendarDropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  tagButton: {
    borderWidth: 1,
    borderColor: '#005F9E',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    backgroundColor: 'white',
  },
  tagButtonSelected: {
    backgroundColor: '#005F9E',
  },
  tagText: {
    color: '#005F9E',
    fontSize: 12,
  },
  tagTextSelected: {
    color: 'white',
  },
});

export default MapScreen; 