// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, Modal, ActivityIndicator, ScrollView, Alert, FlatList, Animated } from 'react-native';
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
import { FontAwesome } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import FallbackView from '../../components/FallbackView';
import { GlobeViewRef } from '../../components/GlobeView';
import { shareJourney } from '../../services/shareService';
import { supabase } from '../../services/supabase';
import * as Notifications from 'expo-notifications';
import NotificationService from '../../services/NotificationService';
import { getFriends } from '../../services/friendService';
import { Button } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import { colors, commonStyles, typography, spacing, borderRadius, shadows, motivationalButton, motivationalButtonText, motivationalButtonSubtitle, mapContainer, missionFormWrapper, missionFormCard, missionFormScroll, missionInputRow, missionInput, missionTextInput, missionTagsRow, missionTag, missionTagText, missionOrderButton, missionGenerateButton, fabButton, fabButtonIcon, fabContainer, overlayLoading } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Friend {
  user2Id: string;
  username: string;
  points: number;
}

type RootStackParamList = {
  Missions: {
    journeyId: string;
    challenges: any[];
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const LoadingModal = ({ visible, currentStep }: { visible: boolean; currentStep: string }) => {
  const { isDarkMode, colors } = useTheme();
  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={[styles.loadingCard, { backgroundColor: isDarkMode ? colors.surface : colors.white }]}>
          <ActivityIndicator size={40} color={isDarkMode ? colors.accent : colors.primary} />
          <Text style={[styles.loadingTitle, { color: isDarkMode ? colors.text.primary : colors.text.primary }]}>Generando viaje</Text>
          <Text style={[styles.loadingStep, { color: isDarkMode ? colors.text.secondary : colors.text.secondary }]}>{currentStep}</Text>
        </View>
      </View>
    </Modal>
  );
};

const DateRangePickerMobile: React.FC<{
  startDateProp: Date | null;
  endDateProp: Date | null;
  onDatesChange: (dates: [Date | null, Date | null]) => void;
  isFormCollapsed?: boolean;
  setIsFormCollapsed?: (collapsed: boolean) => void;
  customButtonStyle?: any;
  customTextStyle?: any;
  customIconColor?: string;
}> = ({ startDateProp, endDateProp, onDatesChange, isFormCollapsed, setIsFormCollapsed, customButtonStyle, customTextStyle, customIconColor }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [markedDates, setMarkedDates] = useState<any>({});
  const { isDarkMode } = useTheme();
  // Fecha mínima: hoy (evitar seleccionar fechas pasadas)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparación
  const minDate = today;

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
      color: isDarkMode ? colors.accent : '#005F9E',
      textColor: isDarkMode ? '#222F43' : 'white'
    };

    // Si hay fecha de fin, marcar días intermedios y fecha de fin
    if (end && start <= end) {
      let currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);

      // Marcar días intermedios
      while (currentDate < end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        newMarkedDates[dateStr] = {
          color: isDarkMode ? '#FFD70033' : '#e6f2ff',
          textColor: isDarkMode ? colors.accent : '#005F9E'
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Marcar fecha de fin
      const endDateStr = end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        endingDay: true,
        color: isDarkMode ? colors.accent : '#005F9E',
        textColor: isDarkMode ? '#222F43' : 'white'
      };
    }

    setMarkedDates(newMarkedDates);
  };

  const handleDayPress = (day: any) => {
    const date = new Date(day.dateString);
    date.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de zona horaria

    // Validar que la fecha no sea pasada
    if (date < today) {
      Alert.alert(
        "Fecha no válida",
        "No puedes seleccionar fechas en el pasado. Por favor, elige una fecha futura.",
        [{ text: "OK" }]
      );
      return;
    }

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
        style={[
          styles.datePickerButton,
          isDarkMode && {
            backgroundColor: colors.surface,
            borderColor: colors.accent
          },
          customButtonStyle
        ]}
        onPress={onToggleCalendar}
      >
        <Ionicons name="calendar" size={20} color={customIconColor ?? (isDarkMode ? colors.accent : '#A8DADC')} style={styles.calendarIcon} />
        <Text style={[styles.datePickerText, isDarkMode && { color: colors.accent }, customTextStyle]}>
          {formatDateRange() || "Selecciona fechas"}
        </Text>
        <Ionicons
          name={showCalendar ? "chevron-up" : "chevron-down"}
          size={20}
          color={customIconColor ?? (isDarkMode ? colors.accent : '#666')}
        />
      </TouchableOpacity>

      {showCalendar && (
        <Modal
          transparent={true}
          visible={showCalendar}
          animationType="fade"
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDarkMode ? { backgroundColor: '#222F43', borderColor: colors.accent, borderWidth: 1 } : { backgroundColor: '#fff', borderColor: colors.primary, borderWidth: 1 }]}>
              <View style={[styles.calendarHeader, { backgroundColor: isDarkMode ? 'transparent' : '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12 }]}>
                <Text style={[
                  styles.calendarTitle,
                  isDarkMode ? { color: '#EDF6F9', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 } : { color: '#1A202C' }
                ]}>Selecciona fechas</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#EDF6F9' : '#1A202C'} />
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
                minDate={minDate.toISOString().split('T')[0]}
                theme={{
                  calendarBackground: isDarkMode ? '#101828' : '#fff',
                  textSectionTitleColor: isDarkMode ? '#EDF6F9' : '#1A202C',
                  selectedDayBackgroundColor: isDarkMode ? colors.accent : colors.primary,
                  selectedDayTextColor: isDarkMode ? '#222F43' : '#ffffff',
                  todayTextColor: isDarkMode ? colors.accent : colors.primary,
                  dayTextColor: isDarkMode ? '#EDF6F9' : '#1A202C',
                  textDisabledColor: isDarkMode ? '#555' : '#d9e1e8',
                  dotColor: isDarkMode ? colors.accent : colors.primary,
                  selectedDotColor: isDarkMode ? '#222F43' : '#ffffff',
                  arrowColor: isDarkMode ? colors.accent : colors.primary,
                  monthTextColor: isDarkMode ? '#EDF6F9' : colors.primary,
                  indicatorColor: isDarkMode ? colors.accent : colors.primary,
                  textDayFontWeight: '400',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 15,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 13,
                  width: 300,
                }}
              />

              <View style={styles.durationContainer}>
                <Text style={[styles.durationText, isDarkMode ? { color: '#EDF6F9' } : { color: colors.primary }]}>Duración: {calculateDuration(startDate, endDate)} días</Text>
                <TouchableOpacity
                  style={[styles.calendarCloseButton, isDarkMode ? { backgroundColor: colors.accent } : { backgroundColor: colors.primary }]}
                  onPress={() => setShowCalendar(false)}
                  disabled={calculateDuration(startDate, endDate) === 0}
                >
                  <Text style={[styles.calendarCloseButtonText, isDarkMode ? { color: calculateDuration(startDate, endDate) === 0 ? '#888' : '#222F43' } : { color: '#fff' }]}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const MapScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDarkMode, colors } = useTheme();
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
  const [useLogicalOrder, setUseLogicalOrder] = useState(false);

  // Estado para indicar carga durante cambio de vista
  const [changingView, setChangingView] = useState(false);
  // Nuevo estado para controlar si el formulario está colapsado
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  // Nueva animación para el formulario
  const formAnimation = useRef(new Animated.Value(1)).current;
  const isSmallScreen = width < 768 || height < 600;

  // Nuevo estado para mostrar el formulario
  const [showForm, setShowForm] = useState(false);

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
    setCurrentStep("Inicializando globo 3D...");

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
    // Incrementamos el timeout para dispositivos más lentos
    setTimeout(() => {
      console.log("Timeout para quitar indicador de carga");
      setChangingView(false);
      setCurrentStep("");
    }, 8000);
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

      // Configurar opciones para obtener la ubicación con timeout
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
        
        // Agregar timeout específico para iOS
        const locationPromise = Location.getCurrentPositionAsync(options);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 15000)
        );
        
        let location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
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
          const lastLocationPromise = Location.getLastKnownPositionAsync();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout obteniendo última ubicación')), 10000)
          );
          
          const lastLocation = await Promise.race([lastLocationPromise, timeoutPromise]) as Location.LocationObject;
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

        // Mensaje de error más amigable
        let errorMessage = 'No se pudo obtener tu ubicación. Usando ubicación por defecto.';
        if (locationError.message?.includes('Timeout')) {
          errorMessage = 'Timeout obteniendo ubicación. Verifica tu conexión GPS.';
        }
        setErrorLocationMsg(errorMessage);
      }
    } catch (error: any) {
      console.error('Error general al obtener ubicación:', error);
      let errorMessage = 'No se pudo obtener tu ubicación. Usando ubicación por defecto.';
      if (error.message?.includes('Timeout')) {
        errorMessage = 'Timeout obteniendo ubicación. Verifica tu conexión GPS.';
      }
      setErrorLocationMsg(errorMessage);
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

  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedJourneyId, setGeneratedJourneyId] = useState<string | null>(null);

  const handleShareJourney = async (friends: Friend[] | Friend) => {
    if (!generatedJourneyId || !user?.id) {
      Alert.alert('Error', 'No se pudo compartir el viaje porque no se encontró el ID del viaje o no estás autenticado.');
      return;
    }

    try {
      const success = await shareJourney(generatedJourneyId, user.id, friends);
      if (success) {
        navigation.navigate('Missions', {
          journeyId: generatedJourneyId,
          challenges: []
        });
      }
    } catch (error) {
      console.error('Error al compartir viaje:', error);
      Alert.alert('Error', 'No se pudo compartir el viaje. Por favor intenta de nuevo.');
    } finally {
      setShowShareModal(false);
      setGeneratedJourneyId(null);
    }
  };

  const handleSearch = async () => {
    if (!user?.id) {
      setErrorMsg('Debes iniciar sesión para generar misiones');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      // Validar fechas
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparación

      let needsDateAdjustment = false;
      let newStartDate = startDate;
      let newEndDate = endDate;

      if (startDate && startDate < today) {
        // Si la fecha de inicio es pasada, ajustarla a hoy
        console.log('Ajustando fecha de inicio pasada a la fecha actual');
        newStartDate = new Date(today);
        needsDateAdjustment = true;

        if (endDate && (endDate < today || endDate < newStartDate)) {
          // Si la fecha de fin también es inválida, avanzarla 3 días desde hoy
          newEndDate = new Date(today);
          newEndDate.setDate(today.getDate() + 3);
        }
      }

      // Aplicar los cambios de fecha si es necesario
      if (needsDateAdjustment) {
        setStartDate(newStartDate);
        setEndDate(newEndDate);
        onDatesChange([newStartDate, newEndDate]);

        // Mostrar alerta informando al usuario
        Alert.alert(
          "Fechas ajustadas",
          "Las fechas seleccionadas eran pasadas y han sido ajustadas a fechas futuras.",
          [{ text: "OK" }]
        );
      }

      if (!user?.id) {
        setErrorMsg('Debes iniciar sesión para generar misiones');
        return;
      }

      // Calcular duración actualizada por si acaba de cambiar
      const updatedDuration = newStartDate && newEndDate
        ? calculateDuration(newStartDate, newEndDate)
        : duration;

      if (!updatedDuration || updatedDuration <= 0) {
        setErrorMsg('Por favor, selecciona fechas válidas para crear un viaje');
        return;
      }

      if (!newStartDate || !newEndDate) {
        setErrorMsg('Selecciona fechas de inicio y fin');
        return;
      }

      if (!searchCity) {
        setErrorMsg('Por favor, ingresa una ciudad de destino');
        return;
      }

      try {
        // Iniciar el proceso de generación
        setCurrentStep(`Preparando tu viaje a ${searchCity}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Paso 2: Buscando lugares
        setCurrentStep(`Buscando lugares interesantes en ${searchCity}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Paso 3: Creando misiones
        const missionCountNum = parseInt(missionCount) || 3; // Usar 3 como valor por defecto si no hay número
        setCurrentStep(`Creando ${missionCountNum} misiones emocionantes...`);

        // Obtener la ciudad seleccionada del filtro de ciudades
        let selectedCityObj = filteredCities.find(city => city.name.toUpperCase() === searchCity);

        // Si no se encuentra una coincidencia exacta, usar la ciudad escrita por el usuario
        const cityName = selectedCityObj ? selectedCityObj.name : searchCity;

        // Llamar a la API para generar las misiones con el nombre real de la ciudad
        const result = await generateMission(
          cityName,
          updatedDuration,
          missionCountNum,
          user.id,
          newStartDate,
          newEndDate,
          selectedTags,
          useLogicalOrder
        );

        if (!result.journeyId) {
          throw new Error('No se recibió el ID del journey');
        }

        // Guardar el ID del journey generado
        setGeneratedJourneyId(result.journeyId);

        // Mostrar notificación de viaje generado
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "¡Nuevo viaje creado!",
            body: `Tu viaje a ${cityName} ha sido generado con éxito con ${missionCountNum} misiones.`,
            data: { journeyId: result.journeyId },
            sound: 'default',
          },
          trigger: null, // Mostrar inmediatamente
        });

        // Mostrar el modal de compartir
        setShowShareModal(true);

      } catch (error) {
        console.error('Error generando misiones:', error);
        setErrorMsg('Error al generar las misiones. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
        setCurrentStep('');
      }
    } catch (error: any) {
      console.error('Error al buscar misiones:', error);
      setErrorMsg(error.message || 'Error al buscar misiones');
      setIsLoading(false);
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
  const DateRangePicker = DateRangePickerMobile;

  // Función para alternar la visibilidad del formulario
  const toggleFormCollapse = () => {
    const toValue = isFormCollapsed ? 1 : 0;
    Animated.timing(formAnimation, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsFormCollapsed(!isFormCollapsed);
  };

  // Función para manejar errores del globo terráqueo
  const handleGlobeError = (error: string) => {
    console.error("Error en el Globo Terráqueo:", error);
    setErrorLocationMsg(`Error al cargar el Globo Terráqueo: ${error}`);
  };

  const [eventMissions, setEventMissions] = useState([]);
  const [eventCities, setEventCities] = useState({});

  // Función para cargar misiones de evento y ciudades
  const fetchEventMissions = async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*');
    if (!error) setEventMissions((data || []).filter(m => m.is_event));
    // Obtener nombres de ciudades para las misiones de evento
    const cityIds = [...new Set((data || []).filter(m => m.is_event && m.cityId).map(m => m.cityId))];
    if (cityIds.length > 0) {
      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds);
      const cityMap = {};
      (citiesData || []).forEach(c => { cityMap[c.id] = c.name; });
      setEventCities(cityMap);
    }
  };

  useEffect(() => {
    fetchEventMissions();
    // Suscripción en tiempo real a la tabla challenges para is_event=true
    const channel = supabase.channel('event-missions-realtime');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, (payload) => {
        // Solo recargar si la misión es de evento
        if (payload.new?.is_event || payload.old?.is_event) {
          fetchEventMissions();
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const [userEventMissions, setUserEventMissions] = useState({});

  // Cargar misiones de evento ya aceptadas por el usuario
  const fetchUserEventMissions = async () => {
    if (!user || !user.id) return;
    const { data, error } = await supabase
      .from('journeys')
      .select('id, cityId, journeys_missions (challengeId)')
      .eq('userId', user.id);
    if (!error && data) {
      // Mapear: { [challengeId]: journeyId }
      const accepted = {};
      data.forEach(journey => {
        (journey.journeys_missions || []).forEach(jm => {
          accepted[jm.challengeId] = journey.id;
        });
      });
      setUserEventMissions(accepted);
    }
  };

  useEffect(() => {
    fetchUserEventMissions();
  }, [user, showEventsModal]);

  const handleAcceptEventMission = async (mission) => {
    try {
      if (!user || !user.id) {
        Alert.alert('Error', 'Debes iniciar sesión para aceptar una misión.');
        return;
      }
      // Verificar si ya la aceptó
      if (userEventMissions && userEventMissions[mission.id]) {
        Alert.alert('Ya aceptada', 'Ya has aceptado esta misión de evento anteriormente.');
        return;
      }
      let cityId = mission.cityId;
      if (!cityId) {
        Alert.alert('Error', 'La misión de evento no tiene una ciudad asociada.');
        return;
      }
      // Buscar journey existente para la ciudad
      let journeyId = null;
      const { data: journeys, error: journeyError } = await supabase
        .from('journeys')
        .select('id')
        .eq('userId', user.id)
        .eq('cityId', cityId);
      if (journeyError) {
        Alert.alert('Error', 'No se pudo comprobar tus viajes.');
        return;
      }
      if (journeys && journeys.length > 0) {
        journeyId = journeys[0].id;
      } else {
        // Crear un nuevo journey para la ciudad
        const { data: newJourney, error: newJourneyError } = await supabase
          .from('journeys')
          .insert({
            userId: user.id,
            cityId: cityId,
            description: `Viaje a evento`,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (newJourneyError || !newJourney) {
          Alert.alert('Error', 'No se pudo crear un viaje para la misión de evento.');
          return;
        }
        journeyId = newJourney.id;
      }
      // Insertar la misión de evento en journeys_missions (permitir duplicados para pruebas)
      const { error: insertError } = await supabase
        .from('journeys_missions')
        .insert({
          journeyId: journeyId,
          challengeId: mission.id,
          completed: false,
          created_at: new Date().toISOString(),
          // Añadimos las fechas del challenge para que la misión tenga el rango correcto
          start_date: mission.start_date || null,
          end_date: mission.end_date || null,
        });
      if (insertError) {
        Alert.alert('Error', 'No se pudo añadir la misión de evento a tu viaje.');
        return;
      }
      Alert.alert('¡Listo!', 'La misión de evento ha sido añadida a tus misiones.');
      setShowEventsModal(false);
      navigation.navigate('Missions', {
        journeyId: journeyId,
        challenges: []
      });
    } catch (error) {
      console.error('Error al aceptar misión de evento:', error);
      Alert.alert('Error', 'No se pudo añadir la misión de evento.');
    }
  };

  const [showEventsModal, setShowEventsModal] = useState(false);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[commonStyles.header, {
        justifyContent: 'space-between',
        backgroundColor: isDarkMode ? colors.background : colors.primary,
      }]}>
        <Text style={[commonStyles.title, { color: isDarkMode ? colors.accent : '#fff' }]}>TravelQuest</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowEventsModal(true)}
            style={[
              { flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm },
              !isDarkMode && {
                backgroundColor: '#fff',
                borderColor: '#005F9E',
                borderWidth: 1.5,
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 22,
                shadowColor: '#005F9E22',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.10,
                shadowRadius: 4,
                elevation: 2,
              }
            ]}>
            <Ionicons name="calendar" size={20} color={isDarkMode ? colors.accent : '#005F9E'} style={{ marginRight: 6 }} />
            <Text style={{
              color: isDarkMode ? colors.accent : '#005F9E',
              fontWeight: 'bold',
              fontSize: 17,
              letterSpacing: 0.2
            }}>Ver Eventos</Text>
          </TouchableOpacity>
          {showForm && (
            <TouchableOpacity onPress={() => setShowForm(false)} style={[commonStyles.button, { backgroundColor: colors.error, padding: 8, borderRadius: borderRadius.round, marginLeft: 8 }]}>
              <Ionicons name="close" size={24} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mapa como fondo */}
      <View style={{ flex: 1, position: 'relative', backgroundColor: colors.background }}>
        <GlobeView
          ref={globeRef}
          region={region}
          onRegionChange={(reg) => setRegion(reg)}
          showsUserLocation={true}
          style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onLoadingChange={(loading) => setChangingView(loading)}
          onLoadEnd={() => setChangingView(false)}
          onError={handleGlobeError}
        />

        {/* Botón motivacional arriba, centrado */}
        {!showForm && (
          <View style={{ alignItems: 'center', width: '100%', position: 'absolute', top: 24, zIndex: 20 }}>
            <TouchableOpacity
              style={[
                styles.motivationalButton,
                {
                  backgroundColor: isDarkMode ? colors.accent : colors.primary,
                  borderRadius: 24,
                  paddingVertical: 22,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 6,
                  width: '90%',
                  maxWidth: 400,
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowForm(true)}
              activeOpacity={0.93}
            >
              <Ionicons name="rocket" size={32} color={'#FFF'} style={{ marginRight: 18 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 22, marginBottom: 2, textAlign: 'left' }}>
                  ¡Comienza tu aventura!
                </Text>
                <Text style={{ color: '#FFF', fontSize: 15, opacity: 0.9, textAlign: 'left' }}>
                  Descubre misiones únicas
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Formulario: card centrado, adaptativo, con fondo blanco semitransparente */}
        {showForm && (
          <View style={{
            position: 'absolute',
            top: 90,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 30,
          }}>
            <View style={{
              width: '95%',
              maxWidth: 400,
              backgroundColor: isDarkMode ? colors.surface : '#F5F7FA',
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: isDarkMode ? colors.border : '#E2E8F0',
              ...shadows.large,
            }}>
              <ScrollView
                style={{ maxHeight: 520 }}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Campo de búsqueda de ciudad */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#29344D' : '#FFFFFF',
                  borderRadius: borderRadius.medium,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334366' : colors.primary,
                  marginBottom: spacing.md,
                  ...shadows.small,
                }}>
                  <Ionicons name="search" size={20} color={isDarkMode ? colors.accent : colors.primary} style={{ marginLeft: spacing.sm, marginRight: spacing.sm }} />
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      color: isDarkMode ? '#EDF6F9' : colors.text.primary,
                      fontSize: 16,
                      paddingVertical: spacing.sm,
                    }}
                    placeholder="¿Qué ciudad quieres visitar?"
                    placeholderTextColor={isDarkMode ? '#FFF' : colors.text.secondary}
                    value={searchCity}
                    onChangeText={handleCitySearch}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  />
                </View>
                {/* Sugerencias de ciudades */}
                {showSuggestions && filteredCities.length > 0 && (
                  <View style={{ backgroundColor: isDarkMode ? '#29344D' : '#FFFFFF', borderRadius: borderRadius.medium, marginBottom: spacing.sm, ...shadows.small }}>
                    {filteredCities.map((city) => (
                      <TouchableOpacity
                        key={city.id}
                        style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm }}
                        onPress={() => handleCitySelect(city)}
                      >
                        <Ionicons name="location" size={18} color={isDarkMode ? colors.accent : colors.primary} style={{ marginRight: spacing.xs }} />
                        <Text style={{ color: isDarkMode ? '#EDF6F9' : colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">{city.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* Inputs de misiones y fechas */}
                <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                  <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#29344D' : '#FFFFFF',
                    borderRadius: borderRadius.medium,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#334366' : colors.primary,
                    marginRight: spacing.sm,
                    ...shadows.small,
                  }}>
                    <Ionicons name="list" size={20} color={isDarkMode ? colors.accent : colors.primary} style={{ marginLeft: spacing.sm, marginRight: spacing.xs }} />
                    <TextInput
                      style={{ flex: 1, backgroundColor: 'transparent', color: isDarkMode ? '#EDF6F9' : colors.text.primary, fontSize: 16, paddingVertical: spacing.sm }}
                      placeholder="Nº misiones"
                      placeholderTextColor={isDarkMode ? '#FFF' : colors.text.secondary}
                      value={missionCount}
                      onChangeText={setMissionCount}
                      keyboardType="numeric"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    />
                  </View>
                  <DateRangePicker
                    startDateProp={startDate}
                    endDateProp={endDate}
                    onDatesChange={onDatesChange}
                    isFormCollapsed={isFormCollapsed}
                    setIsFormCollapsed={setIsFormCollapsed}
                    customButtonStyle={{
                      backgroundColor: isDarkMode ? '#101828' : '#fff',
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                      borderWidth: 1,
                      borderRadius: borderRadius.medium,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      marginBottom: 8,
                    }}
                    customTextStyle={{
                      color: isDarkMode ? colors.accent : colors.primary,
                      fontWeight: 'bold',
                      fontSize: 16,
                    }}
                    customIconColor={isDarkMode ? colors.accent : colors.primary}
                  />
                </View>
                {/* Tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.md }}>
                  {availableTags.map(tag => (
                    <TouchableOpacity
                      key={tag.id}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id)
                          ? (isDarkMode ? '#FFD70033' : colors.primary)
                          : (isDarkMode ? '#29344D' : '#F1F5F9'),
                        borderRadius: borderRadius.round,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        marginRight: spacing.xs,
                        marginBottom: spacing.xs,
                        borderWidth: 1,
                        borderColor: selectedTags.includes(tag.id)
                          ? (isDarkMode ? colors.accent : colors.primary)
                          : (isDarkMode ? '#334366' : colors.primary),
                        maxWidth: 110,
                      }}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <Text style={{
                        color: selectedTags.includes(tag.id)
                          ? (isDarkMode ? colors.accent : colors.surface)
                          : (isDarkMode ? '#EDF6F9' : colors.text.primary),
                        ...typography.small,
                        fontWeight: selectedTags.includes(tag.id) ? 'bold' : 'normal',
                      }} numberOfLines={1} ellipsizeMode="tail">
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Orden lógico */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: useLogicalOrder
                      ? (isDarkMode ? '#FFD70033' : colors.primary)
                      : (isDarkMode ? '#29344D' : '#F1F5F9'),
                    borderRadius: borderRadius.medium,
                    padding: spacing.sm,
                    borderWidth: 1,
                    borderColor: useLogicalOrder ? (isDarkMode ? colors.accent : colors.primary) : (isDarkMode ? '#334366' : colors.primary),
                    marginBottom: spacing.md,
                    justifyContent: 'center',
                  }}
                  onPress={() => setUseLogicalOrder(!useLogicalOrder)}
                >
                  <Ionicons
                    name={useLogicalOrder ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={20}
                    color={useLogicalOrder ? (isDarkMode ? colors.accent : colors.primary) : (isDarkMode ? '#EDF6F9' : colors.primary)}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={{ color: useLogicalOrder ? (isDarkMode ? colors.accent : colors.primary) : (isDarkMode ? '#EDF6F9' : colors.primary), ...typography.body, fontWeight: 'bold' }} numberOfLines={1} ellipsizeMode="tail">
                    Orden Lógico de Misiones
                  </Text>
                </TouchableOpacity>
                {/* Botón de generar misiones */}
                <TouchableOpacity
                  style={[{
                    flexDirection: 'row',
                    backgroundColor: (!searchCity || !startDate || !endDate)
                      ? (isDarkMode ? '#334366' : '#D1D5DB')
                      : (isDarkMode ? colors.accent : colors.primary),
                    borderRadius: borderRadius.medium,
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: spacing.md,
                    marginBottom: spacing.sm,
                    ...shadows.small,
                  }]}
                  onPress={handleSearch}
                  disabled={!searchCity || !startDate || !endDate}
                >
                  <Ionicons name="rocket" size={20} color={(!searchCity || !startDate || !endDate)
                    ? (isDarkMode ? '#A9D6E5' : colors.text.secondary)
                    : (isDarkMode ? '#222F43' : '#fff')} style={{ marginRight: spacing.sm }} />
                  <Text style={{
                    color: (!searchCity || !startDate || !endDate)
                      ? (isDarkMode ? '#A9D6E5' : colors.text.secondary)
                      : (isDarkMode ? '#222F43' : '#fff'),
                    ...typography.body,
                    fontWeight: 'bold',
                  }} numberOfLines={1} ellipsizeMode="tail">
                    Generar Misiones
                  </Text>
                </TouchableOpacity>
                {errorMsg ? <Text style={commonStyles.errorText}>{errorMsg}</Text> : null}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      <LoadingModal visible={isLoading} currentStep={currentStep} />

      <FriendSelectionModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          // Si el usuario no quiere compartir, navegar directamente a misiones
          if (generatedJourneyId) {
            navigation.navigate('Missions', {
              journeyId: generatedJourneyId,
              challenges: []
            });
            setGeneratedJourneyId(null);
          }
        }}
        onSelect={handleShareJourney}
      />

      {/* Overlay para cambiar entre vistas */}
      {changingView && (
        <View style={changingViewOverlay}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={loadingText}>
            {currentStep || "Cargando globo terrestre..."}
          </Text>
        </View>
      )}

      {/* Modal para mostrar las misiones de evento */}
      {showEventsModal && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowEventsModal(false)}
          transparent={false}
        >
          <SafeAreaView style={[
            styles.eventsModalContainer,
            { flex: 1 },
            !isDarkMode && { backgroundColor: '#F5F7FA' },
            isDarkMode && { backgroundColor: colors.background || '#101828' }
          ]}>
            <Text style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.accent : '#005F9E' }
            ]}>Misiones de Evento</Text>
            <ScrollView>
              {eventMissions
                .filter(mission => {
                  // Si tiene fecha de fin, solo mostrar si no ha expirado
                  if (mission.start_date && mission.end_date) {
                    const fechaFin = new Date(mission.end_date);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    return fechaFin >= hoy;
                  }
                  // Si no tiene fecha de fin, mostrar siempre
                  return true;
                })
                .map(mission => {
                  // Calcular días restantes usando start_date y end_date
                  let diasRestantes = null;
                  let rangoFechas = null;
                  let haComenzado = true;
                  if (mission.start_date && mission.end_date) {
                    const fechaInicio = new Date(mission.start_date);
                    const fechaFin = new Date(mission.end_date);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
                    diasRestantes = diff >= 0 ? diff : 0;
                    rangoFechas = `Del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`;
                    haComenzado = hoy >= fechaInicio;
                  }
                  const ciudad = mission.cityId && eventCities[mission.cityId] ? eventCities[mission.cityId] : 'Ciudad desconocida';
                  return (
                    <View key={mission.id} style={[
                      styles.eventCard,
                      {
                        borderWidth: 2,
                        borderColor: isDarkMode ? colors.accent : '#005F9E',
                        borderRadius: 16,
                        marginBottom: 18,
                        backgroundColor: 'transparent',
                      }
                    ]}>
                      <Text style={{ fontWeight: 'bold', fontSize: 28, marginBottom: 2 }}>
                        <Text style={{ color: isDarkMode ? colors.accent : '#005F9E' }}>Ciudad:</Text>
                        <Text style={{ color: isDarkMode ? '#FFF' : '#005F9E' }}> {ciudad}</Text>
                      </Text>
                      <Text style={{ color: isDarkMode ? '#FFF' : '#005F9E', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{mission.title}</Text>
                      <Text style={{ color: isDarkMode ? '#E0E0E0' : '#1D3557', fontWeight: 'bold', marginBottom: 4 }}>
                        {rangoFechas}
                      </Text>
                      <Text style={{ color: isDarkMode ? '#CCCCCC' : '#222' }}>{mission.description}</Text>
                      {mission.start_date && mission.end_date ? (
                        <View style={{
                          backgroundColor: isDarkMode ? colors.accent : '#005F9E',
                          borderRadius: 8,
                          padding: 6,
                          marginVertical: 6,
                          alignSelf: 'flex-start'
                        }}>
                          <Text style={{
                            color: isDarkMode ? '#222' : '#fff',
                            fontWeight: 'bold'
                          }}>
                            {diasRestantes > 0
                              ? `¡Tiempo limitado! Quedan ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`
                              : 'Expirada'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{
                          backgroundColor: isDarkMode ? '#232A36' : '#B3D8F8',
                          borderRadius: 8,
                          padding: 6,
                          marginVertical: 6,
                          alignSelf: 'flex-start'
                        }}>
                          <Text style={{ color: isDarkMode ? '#FFF' : '#005F9E', fontWeight: 'bold' }}>Sin límite de tiempo</Text>
                        </View>
                      )}
                      <Button
                        mode="contained"
                        onPress={() => handleAcceptEventMission(mission)}
                        style={{ marginTop: 8, borderRadius: 22, backgroundColor: isDarkMode ? colors.accent : '#005F9E' }}
                        labelStyle={{ color: isDarkMode ? '#222' : '#fff', fontWeight: 'bold' }}
                        disabled={Boolean(!haComenzado || (userEventMissions && userEventMissions[mission.id]))}
                      >
                        {!haComenzado
                          ? 'Disponible próximamente'
                          : (userEventMissions && userEventMissions[mission.id])
                            ? 'Ya aceptada'
                            : 'Quiero esta misión'}
                      </Button>
                      {!haComenzado && (
                        <Text style={{ color: '#FF6B6B', marginTop: 4, fontWeight: 'bold' }}>
                          Esta misión estará disponible a partir de la fecha de inicio
                        </Text>
                      )}
                    </View>
                  );
                })}
            </ScrollView>
            <Button
              onPress={() => setShowEventsModal(false)}
              style={{ marginTop: 16, alignSelf: 'center', backgroundColor: isDarkMode ? colors.accent : '#005F9E', borderRadius: 18, paddingHorizontal: 24 }}
              labelStyle={{ color: isDarkMode ? '#222' : '#fff', fontWeight: 'bold', fontSize: 15 }}
            >
              Cerrar
            </Button>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

// Añadir el componente FriendSelectionModal
const FriendSelectionModal = ({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (friends: Friend[]) => void;
}) => {
  const { isDarkMode, colors } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  // Limpiar la selección cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setSelectedFriends([]);
      setIsSharing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const fetchFriends = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const friendsList = await getFriends(user.id);
          setFriends(friendsList || []);
        } catch (error) {
          console.error('Error fetching friends:', error);
          setFriends([]);
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
    }
  }, [visible, user]);

  const toggleFriendSelection = (friendId: string) => {
    if (isSharing) return; // No permitir cambios durante el proceso de compartir

    setSelectedFriends(current => {
      if (current.includes(friendId)) {
        return current.filter(id => id !== friendId);
      } else {
        return [...current, friendId];
      }
    });
  };

  const selectAllFriends = () => {
    if (isSharing) return; // No permitir cambios durante el proceso de compartir

    if (selectedFriends.length === friends.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedFriends([]);
    } else {
      // Seleccionar todos
      setSelectedFriends(friends.map(friend => friend.user2Id));
    }
  };

  const handleShareWithSelected = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Selección vacía', 'Por favor, selecciona al menos un amigo para compartir el viaje.');
      return;
    }

    // Prevenir múltiples envíos
    if (isSharing) return;

    setIsSharing(true);

    const selectedFriendsObjects = friends.filter(friend =>
      selectedFriends.includes(friend.user2Id)
    );

    try {
      await onSelect(selectedFriendsObjects);
    } catch (error) {
      console.error('Error al compartir viaje:', error);
      // Si hay un error, permitir que el usuario intente de nuevo
      setIsSharing(false);
      Alert.alert('Error', 'Ocurrió un error al compartir el viaje. Inténtalo de nuevo.');
    }
    // No reseteamos isSharing aquí porque onSelect cerrará el modal y visible cambiará,
    // lo que reseteará isSharing en el useEffect
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => !isSharing && onClose()}
      transparent
    >
      <View style={styles.shareModalOverlay}>
        <View style={[styles.shareModalContent, { backgroundColor: isDarkMode ? colors.surface : colors.white }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.shareModalTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Compartir Aventura</Text>
            {!isSharing && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={isDarkMode ? colors.text.secondary : "#666"} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.shareModalSubtitle, { color: isDarkMode ? colors.text.secondary : colors.text.secondary }]}>
            Selecciona a los amigos con los que quieres compartir este viaje
          </Text>

          {!loading && friends.length > 0 && (
            <TouchableOpacity
              style={[
                styles.selectAllButton,
                isDarkMode && { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1 }
              ]}
              onPress={selectAllFriends}
              disabled={isSharing}
            >
              <Text style={[styles.selectAllText, { color: isDarkMode ? colors.accent : colors.primary }]}>
                {selectedFriends.length === friends.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </Text>
              <Ionicons
                name={selectedFriends.length === friends.length
                  ? "checkmark-circle"
                  : "checkmark-circle-outline"}
                size={20}
                color={isDarkMode ? colors.accent : colors.primary}
              />
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDarkMode ? colors.accent : colors.primary} />
              <Text style={[styles.loadingText, { color: isDarkMode ? colors.text.primary : colors.text.primary }]}>Cargando amigos...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.friendsListContainer}
              contentContainerStyle={friends.length === 0 ? styles.emptyListContent : null}
            >
              {friends.map((item) => (
                <TouchableOpacity
                  key={item.user2Id}
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(item.user2Id) && (isDarkMode ? { backgroundColor: '#3A4256' } : styles.friendItemSelected),
                    isSharing && styles.disabledItem,
                    isDarkMode && { borderBottomColor: colors.accent, borderBottomWidth: 1 }
                  ]}
                  onPress={() => toggleFriendSelection(item.user2Id)}
                  disabled={isSharing}
                >
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: isDarkMode ? colors.accent : colors.text.primary }]}>{item.username}</Text>
                    <Text style={[styles.friendPoints, { color: isDarkMode ? colors.white : colors.text.secondary }]}>Puntos: {item.points}</Text>
                  </View>
                  <Ionicons
                    name={selectedFriends.includes(item.user2Id)
                      ? "checkmark-circle"
                      : "ellipse-outline"}
                    size={24}
                    color={selectedFriends.includes(item.user2Id) ? colors.accent : (isDarkMode ? colors.white : "#ccc")}
                  />
                </TouchableOpacity>
              ))}
              {friends.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No tienes amigos agregados</Text>
                  <Text style={styles.emptySubtext}>Agrega amigos para poder compartir tus viajes</Text>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.footerContainer}>
            <Text style={[
              styles.selectedCountText,
              { color: isDarkMode ? colors.accent : colors.primary }
            ]}>
              {selectedFriends.length} {selectedFriends.length === 1 ? 'amigo seleccionado' : 'amigos seleccionados'}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isSharing && styles.disabledButton
                ]}
                onPress={onClose}
                disabled={isSharing}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  isDarkMode && {
                    backgroundColor: selectedFriends.length > 0 ? colors.accent : colors.surface
                  },
                  (selectedFriends.length === 0 || isSharing) && styles.disabledButton
                ]}
                onPress={handleShareWithSelected}
                disabled={selectedFriends.length === 0 || isSharing}
              >
                {isSharing ? (
                  <View style={styles.sharingButtonContent}>
                    <ActivityIndicator size="small" color={isDarkMode ? colors.white : "#fff"} />
                    <Text style={[styles.shareButtonText, { marginLeft: 8, color: isDarkMode ? colors.white : '#fff' }]}>Compartiendo...</Text>
                  </View>
                ) : (
                  <Text style={{
                    color: isDarkMode
                      ? (selectedFriends.length > 0 ? colors.white : colors.text.secondary)
                      : (selectedFriends.length > 0 ? '#fff' : '#EDF6F9'),
                    fontWeight: 'bold'
                  }}>
                    {selectedFriends.length === 0
                      ? "Selecciona amigos"
                      : `Compartir (${selectedFriends.length})`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay para bloquear interacciones mientras se comparte */}
          {isSharing && (
            <View style={styles.sharingOverlay}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={styles.sharingText}>Compartiendo viaje...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: colors.text.light,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  collapseButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 6,
    marginLeft: 8,
  },
  searchContainer: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainerSmall: {
    margin: 8,
    padding: 12,
  },
  cityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
    color: colors.text.secondary,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    color: colors.secondary,
    paddingVertical: 10,
  },
  suggestionsList: {
    backgroundColor: colors.white,
    borderRadius: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 8,
  },
  locationIcon: {
    color: colors.primary,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginRight: 8,
    flex: 1,
  },
  missionIcon: {
    marginRight: 8,
    color: colors.text.secondary,
  },
  smallInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
    gap: 8,
  },
  tagButton: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.white,
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.white,
  },
  tagText: {
    color: colors.secondary,
    fontSize: 14,
  },
  tagTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  mapContainerExpanded: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  map: {
    flex: 1,
  },
  durationOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,95,158,0.85)',
    borderRadius: 10,
    padding: 8,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  changingViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
  },
  loadingStep: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 10,
    backgroundColor: colors.secondary,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    width: '90%',
    color: colors.text.primary,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 8,
    width: '90%',
  },
  calendarControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarArrow: {
    padding: 8,
  },
  datePickerContainer: {
    flex: 1,
    marginLeft: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  datePickerText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  calendarCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    width: 300
  },
  durationText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  friendsListContainer: {
    maxHeight: 300,
    marginVertical: 10,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendItemSelected: {
    backgroundColor: '#e6f7ff',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  friendPoints: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 8,
  },
  footerContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  shareButton: {
    flex: 1.5,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  closeButton: {
    padding: 8,
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  shareModalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  selectAllButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: '#EDF6F9',
  },
  disabledItem: {
    opacity: 0.6,
  },
  sharingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  sharingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  logicalOrderContainer: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  logicalOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EAFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#005F9E',
  },
  logicalOrderButtonActive: {
    backgroundColor: '#005F9E',
  },
  logicalOrderText: {
    color: '#005F9E',
    fontSize: 16,
    fontWeight: '500',
  },
  logicalOrderTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  eventCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  eventButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    zIndex: 100,
  },
  eventButtonText: {
    color: '#26547C',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  eventsModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 24,
    paddingTop: 48,
  },
  eventsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  eventsHeaderButtonText: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MapScreen; 