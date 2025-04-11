// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, Modal, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import generateMission from '../../services/missionGenerator';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { searchCities } from '../../services/supabase';
import GlobeView from '../../components/GlobeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MissionResponse } from '../../hooks/useFetchMissions';
import { FlatList } from 'react-native-web';
import { FontAwesome } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import FallbackView from '../../components/FallbackView';
import { GlobeViewRef } from '../../components/GlobeView';

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
  <Modal transparent={true} visible={visible} animationType="fade">
    <View style={styles.modalContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size={40} color="#005F9E" />
        <Text style={styles.loadingTitle}>Generando viaje</Text>
        <Text style={styles.loadingStep}>{currentStep}</Text>
      </View>
    </View>
  </Modal>
);

const DateRangePickerMobile: React.FC<{
  startDateProp: Date | null;
  endDateProp: Date | null;
  onDatesChange: (dates: [Date | null, Date | null]) => void;
  isFormCollapsed?: boolean;
  setIsFormCollapsed?: (collapsed: boolean) => void;
}> = ({ startDateProp, endDateProp, onDatesChange, isFormCollapsed, setIsFormCollapsed }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    if (startDateProp !== startDate) {
    setStartDate(startDateProp);
    }
    if (endDateProp !== endDate) {
    setEndDate(endDateProp);
    }
  }, [startDateProp, endDateProp]);

  useEffect(() => {
    updateMarkedDates(startDate, endDate);
  }, [startDate, endDate]);

  const calculateDuration = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Incluir el día de inicio y fin
  };

  const updateMarkedDates = (start: Date | null, end: Date | null) => {
    if (!start) return;
    
    const newMarkedDates: any = {};
    
    // Marcar fecha de inicio
    const startDateStr = start.toISOString().split('T')[0];
    newMarkedDates[startDateStr] = {
        startingDay: true, 
        color: '#005F9E',
        textColor: 'white'
      };
    
    // Si hay fecha de fin, marcar días intermedios y fecha de fin
    if (end && start <= end) {
      let currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Marcar días intermedios
      while (currentDate < end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        newMarkedDates[dateStr] = { 
          color: '#e6f2ff',
          textColor: '#005F9E'
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Marcar fecha de fin
      const endDateStr = end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        endingDay: true,
        color: '#005F9E',
        textColor: 'white'
      };
    }
    
    setMarkedDates(newMarkedDates);
  };

  const handleDayPress = (day: any) => {
    const date = new Date(day.dateString);
    date.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de zona horaria
    
    if (!startDate || (startDate && endDate)) {
      // Si no hay fecha de inicio o ambas fechas están establecidas, empezar de nuevo
      setStartDate(date);
      setEndDate(null);
      onDatesChange([date, null]);
    } else {
      // Si ya hay fecha de inicio pero no de fin
      if (date < startDate) {
        // Si la fecha seleccionada es anterior a la fecha de inicio, invertir
        setEndDate(startDate);
        setStartDate(date);
        onDatesChange([date, startDate]);
      } else {
        // Establecer fecha de fin normalmente
        setEndDate(date);
        onDatesChange([startDate, date]);
      }
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No seleccionada';
    return format(date, 'dd MMM yyyy', { locale: es });
  };

  const formatDateRange = (): string => {
    if (!startDate) return 'Selecciona fechas';
    if (!endDate) return `Desde ${formatDate(startDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const onToggleCalendar = () => {
    // Al abrir el calendario, asegurar que el formulario no esté colapsado
    if (isFormCollapsed && setIsFormCollapsed) {
      setIsFormCollapsed(false);
    }
    
    // Luego cambiar el estado del calendario
    setShowCalendar(!showCalendar);
  };

  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={onToggleCalendar}
      >
        <View style={styles.datePickerContent}>
          <Text style={styles.datePickerText}>{formatDateRange()}</Text>
          <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={16} color="white" />
        </View>
      </TouchableOpacity>
      
      {showCalendar && (
        <Modal
          transparent={true}
          visible={showCalendar}
          animationType="fade"
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Selecciona fechas</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
          <Calendar
                markingType={'period'}
                markedDates={markedDates}
            onDayPress={handleDayPress}
                monthFormat={'MMMM yyyy'}
                hideExtraDays={true}
                firstDay={1}
                enableSwipeMonths={true}
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
                  textDayFontWeight: '300',
                  textDayHeaderFontWeight: '300',
                  textDayFontSize: 14,
                  textMonthFontSize: 14,
                  textDayHeaderFontSize: 12
                }}
              />
            
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  Duración: {calculateDuration(startDate, endDate)} días
                </Text>
                <TouchableOpacity 
                  style={styles.calendarCloseButton}
                  onPress={() => setShowCalendar(false)}
                >
                  <Text style={styles.calendarCloseButtonText}>Aplicar</Text>
                </TouchableOpacity>
        </View>
            </View>
          </View>
        </Modal>
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (startDateProp !== startDate) {
    setStartDate(startDateProp);
    }
    if (endDateProp !== endDate) {
    setEndDate(endDateProp);
    }
  }, [startDateProp, endDateProp]);
  
  useEffect(() => {
    // Cerrar el calendario al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const calculateDuration = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Incluir el día de inicio y fin
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No seleccionada';
    return format(date, 'dd MMM yyyy', { locale: es });
  };

  const formatDateRange = (): string => {
    if (!startDate) return 'Selecciona fechas';
    if (!endDate) return `Desde ${formatDate(startDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };
  
  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Si no hay fecha de inicio o ambas fechas están establecidas, empezar de nuevo
      setStartDate(date);
      setEndDate(null);
      onDatesChange([date, null]);
    } else {
      // Si ya hay fecha de inicio pero no de fin
      if (date < startDate) {
        // Si la fecha seleccionada es anterior a la fecha de inicio, invertir
        setEndDate(startDate);
        setStartDate(date);
        onDatesChange([date, startDate]);
      } else {
        // Establecer fecha de fin normalmente
        setEndDate(date);
        onDatesChange([startDate, date]);
      }
    }
  };

  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <View style={styles.datePickerContent}>
          <Text style={styles.datePickerText}>{formatDateRange()}</Text>
          <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={16} color="white" />
        </View>
      </TouchableOpacity>
      
      {showCalendar && (
        <View style={styles.calendarOverlay}>
          <View 
            style={styles.calendarContainer}
            ref={calendarRef as any}
          >
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Selecciona fechas</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.calendarSubtitle}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </Text>
            
            <View style={styles.calendarControls}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarArrow}>
                <Ionicons name="chevron-back" size={24} color="#005F9E" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarArrow}>
                <Ionicons name="chevron-forward" size={24} color="#005F9E" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendar}>
              {/* Código del calendario */}
            </View>
            
            <Text style={styles.durationText}>
              Duración: {calculateDuration(startDate, endDate)} días
            </Text>
            
            <TouchableOpacity 
              style={styles.calendarCloseButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const MapScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  // Referencia al WebView para poder enviar mensajes al globo
  const webViewRef = useRef<WebView>(null);
  // Añadir la referencia a GlobeView
  const globeRef = useRef<GlobeViewRef>(null);
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
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [errorLocationMsg, setErrorLocationMsg] = useState<string | null>(null);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 40.416775, // Madrid por defecto
    longitude: -3.703790,
  });
  // Estado para los tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Estado para indicar carga durante cambio de vista
  const [changingView, setChangingView] = useState(false);
  // Nuevo estado para controlar si el formulario está colapsado
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const isSmallScreen = width < 768 || height < 600;

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

  // Función para cargar el globo terráqueo de Cesium
  const loadCesiumGlobe = () => {
    console.log("Cargando globo terráqueo de Cesium...");
    
    // Indicar que estamos cargando
    setChangingView(true);
    
    // Recargar el componente forzando una re-renderización
    // Esto es más efectivo que simplemente esperar
    if (webViewRef.current) {
      try {
        // Intentar recargar la WebView (si existe el método)
        if (webViewRef.current.reload) {
          console.log("Recargando WebView...");
          webViewRef.current.reload();
        }
      } catch (error) {
        console.error("Error al recargar WebView:", error);
      }
    }
    
    // Como respaldo, establecer un timeout para quitar el indicador de carga
    setTimeout(() => {
      setChangingView(false);
    }, 3000);
  };

  useEffect(() => {
    // Obtener la ubicación del usuario cuando la componente se monta
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
      const newDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Incluir el día de inicio y fin
      console.log('Nueva duración calculada:', newDuration);
      setDuration(newDuration);
    } else {
      setDuration(0);
    }
  };

  // Elegir el componente correcto según la plataforma
  const DateRangePicker = Platform.OS === 'web' ? DateRangePickerWeb : DateRangePickerMobile;

  // Función para alternar la visibilidad del formulario
  const toggleFormCollapse = () => {
    setIsFormCollapsed(!isFormCollapsed);
  };

  // Función para manejar errores del globo terráqueo
  const handleGlobeError = (error: string) => {
    console.error("Error en el Globo Terráqueo:", error);
    setErrorLocationMsg(`Error al cargar el Globo Terráqueo: ${error}`);
  };

  // Función para reintentar cargar el globo terráqueo
  const retryLoadGlobe = () => {
    setErrorLocationMsg(null);
    loadCesiumGlobe();
  };

  return (
    <View style={styles.container}>
      {/* Barra superior con botón para expandir/colapsar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>TravelQuest</Text>
        <TouchableOpacity onPress={toggleFormCollapse} style={styles.collapseButton}>
          <Ionicons name={isFormCollapsed ? "chevron-down" : "chevron-up"} size={24} color="#005F9E" />
        </TouchableOpacity>
      </View>

      {/* Mapa debajo de todo */}
      <View style={[
        styles.mapContainer,
        isFormCollapsed && styles.mapContainerExpanded
      ]}>
        {/* Mostrar la duración del viaje en días encima del mapa */}
        {startDate && endDate && (
          <View style={styles.durationOverlay}>
            <Text style={styles.durationOverlayText}>
              <Ionicons name="calendar" size={16} color="white" /> {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
            </Text>
            <Text style={styles.durationOverlayText}>
              <Ionicons name="time" size={16} color="white" /> Duración: {calculateDuration(startDate, endDate)} días
            </Text>
          </View>
        )}
        
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#005F9E" />
            <Text style={styles.loadingText}>Cargando ubicación...</Text>
          </View>
        ) : errorLocationMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorLocationMsg}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getLocation}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Globo terráqueo */}
            <GlobeView 
              ref={globeRef}
              region={region}
              onRegionChange={(reg) => {
                // Actualizamos la región
                setRegion(reg);
              }}
              showsUserLocation={true}
              style={styles.map}
              onLoadingChange={(loading) => {
                console.log("Cambio de estado de carga del mapa:", loading);
                setChangingView(loading);
              }}
              onError={handleGlobeError}
            />
            
            {/* Botón flotante para recargar el globo */}
            <TouchableOpacity 
              style={styles.floatingButton}
              onPress={retryLoadGlobe}
            >
              <Ionicons name="refresh" size={20} color="white" style={{marginRight: 5}} />
              <Text style={{color: 'white', fontWeight: 'bold'}}>Recargar Globo 3D</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Contenedor del formulario, que puede estar colapsado - colocado al final para que se muestre encima */}
      {!isFormCollapsed && (
        <ScrollView 
          style={[
            styles.searchContainer,
            isSmallScreen && styles.searchContainerSmall
          ]}
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Nº misiones"
              value={missionCount}
              onChangeText={setMissionCount}
              keyboardType="numeric"
            />
            
            <DateRangePicker
              startDateProp={startDate}
              endDateProp={endDate}
              onDatesChange={onDatesChange}
              isFormCollapsed={isFormCollapsed}
              setIsFormCollapsed={setIsFormCollapsed}
            />
          </View>
          
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
            style={[
              styles.button,
              (!searchCity || !startDate || !endDate) && styles.buttonDisabled
            ]}
            onPress={handleSearch}
            disabled={!searchCity || !startDate || !endDate}
          >
            <Text style={styles.buttonText}>
              Generar Misiones
            </Text>
          </TouchableOpacity>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </ScrollView>
      )}

      <LoadingModal visible={isLoading} currentStep={currentStep} />

      {/* Overlay para cambiar entre vistas */}
      {changingView && (
        <View style={styles.changingViewOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Cargando vista...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  collapseButton: {
    padding: 5,
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
    position: 'absolute',
    top: 51,
    left: 0,
    right: 0,
    zIndex: 9,
    maxHeight: '60%',
  },
  searchContainerSmall: {
    padding: 12,
    maxHeight: '50%',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  smallInput: {
    flex: 0.4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  mapContainerExpanded: {
    flex: 1,
  },
  tagButtonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
  },
  tagTextSmall: {
    fontSize: 10,
  },
  map: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    flex: 0.55,
    position: 'relative',
    zIndex: 999,
  },
  datePickerButton: {
    backgroundColor: '#005F9E',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  datePickerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  calendarOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0, 
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    maxHeight: '70%',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
  calendarControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarArrow: {
    padding: 5,
  },
  calendarCloseButton: {
    backgroundColor: '#005F9E',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  durationText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
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
    fontSize: 16,
    color: '#333',
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
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    marginTop: 5,
    justifyContent: 'center',
  },
  tagButton: {
    borderWidth: 1.5,
    borderColor: '#005F9E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 5,
    backgroundColor: 'white',
    minWidth: 95,
  },
  tagButtonSelected: {
    backgroundColor: '#005F9E',
  },
  tagText: {
    color: '#005F9E',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  tagTextSelected: {
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#005F9E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 999,
  },
  changingViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  durationOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 95, 158, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  durationOverlayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarStyle: {
    height: 300,
    maxHeight: '50vh',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default MapScreen; 