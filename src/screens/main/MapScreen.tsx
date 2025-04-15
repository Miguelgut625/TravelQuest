// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, Modal, ActivityIndicator, ScrollView, Alert, FlatList } from 'react-native';
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

// Añadir el componente FriendSelectionModal
const FriendSelectionModal = ({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (friends: Friend[]) => void;
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  // Limpiar la selección cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setSelectedFriends([]);
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
          const { data: friendData, error } = await supabase
            .from('friends')
            .select('user2Id')
            .eq('user1Id', user.id);
          if (error) throw error;

          const friendDetails = await Promise.all(
            friendData.map(async (friend: { user2Id: string }) => {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, points')
                .eq('id', friend.user2Id)
                .single();
              if (userError) return null;
              return {
                user2Id: friend.user2Id,
                username: userData.username,
                points: userData.points,
              };
            })
          );

          setFriends(friendDetails.filter((f) => f !== null) as Friend[]);
        } catch (error) {
          console.error('Error fetching friends:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
    }
  }, [visible, user]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(current => {
      if (current.includes(friendId)) {
        return current.filter(id => id !== friendId);
      } else {
        return [...current, friendId];
      }
    });
  };

  const selectAllFriends = () => {
    if (selectedFriends.length === friends.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedFriends([]);
    } else {
      // Seleccionar todos
      setSelectedFriends(friends.map(friend => friend.user2Id));
    }
  };

  const handleShareWithSelected = () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Selección vacía', 'Por favor, selecciona al menos un amigo para compartir el viaje.');
      return;
    }

    const selectedFriendsObjects = friends.filter(friend => 
      selectedFriends.includes(friend.user2Id)
    );
    
    onSelect(selectedFriendsObjects);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.shareModalOverlay}>
        <View style={styles.shareModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.shareModalTitle}>Compartir Aventura</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shareModalSubtitle}>
            Selecciona a los amigos con los que quieres compartir este viaje
          </Text>
          
          {!loading && friends.length > 0 && (
            <TouchableOpacity 
              style={styles.selectAllButton} 
              onPress={selectAllFriends}
            >
              <Text style={styles.selectAllText}>
                {selectedFriends.length === friends.length 
                  ? "Deseleccionar todos" 
                  : "Seleccionar todos"}
              </Text>
              <Ionicons 
                name={selectedFriends.length === friends.length 
                  ? "checkmark-circle" 
                  : "checkmark-circle-outline"} 
                size={20} 
                color="#005F9E" 
              />
            </TouchableOpacity>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={styles.loadingText}>Cargando amigos...</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.user2Id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(item.user2Id) && styles.friendItemSelected
                  ]} 
                  onPress={() => toggleFriendSelection(item.user2Id)}
                >
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.username}</Text>
                    <Text style={styles.friendPoints}>Puntos: {item.points}</Text>
                  </View>
                  <Ionicons 
                    name={selectedFriends.includes(item.user2Id) 
                      ? "checkmark-circle" 
                      : "ellipse-outline"} 
                    size={24} 
                    color={selectedFriends.includes(item.user2Id) ? "#005F9E" : "#ccc"} 
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No tienes amigos agregados</Text>
                  <Text style={styles.emptySubtext}>Agrega amigos para poder compartir tus viajes</Text>
                </View>
              }
            />
          )}
          
          <View style={styles.footerContainer}>
            {selectedFriends.length > 0 && (
              <Text style={styles.selectedCountText}>
                {selectedFriends.length} {selectedFriends.length === 1 ? 'amigo seleccionado' : 'amigos seleccionados'}
              </Text>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.shareButton, selectedFriends.length === 0 && styles.disabledButton]} 
                onPress={handleShareWithSelected}
                disabled={selectedFriends.length === 0}
              >
                <Text style={styles.shareButtonText}>
                  {selectedFriends.length === 0 
                    ? "Selecciona amigos" 
                    : `Compartir (${selectedFriends.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
}> = ({ startDateProp, endDateProp, onDatesChange, isFormCollapsed, setIsFormCollapsed }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(startDateProp);
  const [endDate, setEndDate] = useState<Date | null>(endDateProp);
  const [markedDates, setMarkedDates] = useState<any>({});
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
                minDate={minDate}
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
  
  // Obtener fecha de hoy para validación
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparación
  
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
    // Validar que no sea una fecha pasada
    if (date < today) {
      // En web usamos una alerta nativa
      if (typeof window !== 'undefined') {
        window.alert("No puedes seleccionar fechas en el pasado. Por favor, elige una fecha futura.");
      }
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

  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedJourneyId, setGeneratedJourneyId] = useState<string | null>(null);

  const handleShareJourney = async (friends: Friend[]) => {
    if (!generatedJourneyId || !user?.id) return;

    setIsLoading(true);
    setCurrentStep('Compartiendo viaje...');

    try {
      // Obtener información del viaje para crear un solo grupo
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select(`
          id,
          description,
          start_date,
          end_date,
          cityId,
          cities (
            id,
            name
          )
        `)
        .eq('id', generatedJourneyId)
        .single();

      if (journeyError) throw journeyError;

      // Preparar fechas y nombre de la ciudad
      const startDate = new Date(journeyData.start_date);
      const endDate = new Date(journeyData.end_date);
      const cityName = journeyData.cities?.name || 'destino desconocido';

      // Crear un solo grupo para todos los amigos
      const groupName = `Viaje a ${cityName}`;
      const description = `Viaje a ${cityName} del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;
      
      // Crear el grupo
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          journey_id: generatedJourneyId,
          description
        })
        .select('*')
        .single();
        
      if (groupError) throw groupError;
      
      // Agregar al creador como miembro y administrador automáticamente
      const { error: ownerMemberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin',
          status: 'accepted',
          joined_at: new Date().toISOString()
        });

      if (ownerMemberError) throw ownerMemberError;

      // Añadir cada amigo al grupo y crear journeys_shared
      const invitationPromises = friends.map(async (friend) => {
        // Verificar si el viaje ya fue compartido con este amigo
        const { data: existingShare, error: existingShareError } = await supabase
          .from('journeys_shared')
          .select('id, status')
          .eq('journeyId', generatedJourneyId)
          .eq('sharedWithUserId', friend.user2Id)
          .single();

        // Si ya existe y está aceptado, no hacemos nada
        if (!existingShareError && existingShare && existingShare.status === 'accepted') {
          return { success: true, message: `El viaje ya fue compartido con ${friend.username} anteriormente.` };
        }

        // Invitar al amigo al grupo creado
        const { data: invitationData, error: invitationError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupData.id,
            user_id: friend.user2Id,
            role: 'member',
            status: 'pending'
          })
          .select('id')
          .single();

        if (invitationError) throw invitationError;

        // Guardar en journeys_shared con estado pendiente - sin usar la columna groupId
        if (existingShareError || !existingShare) {
          const { error } = await supabase
            .from('journeys_shared')
            .insert({
              journeyId: generatedJourneyId,
              ownerId: user.id,
              sharedWithUserId: friend.user2Id,
              status: 'pending'
              // Eliminamos la referencia a groupId que no existe en la tabla
            });

          if (error) throw error;
        } else {
          // Actualizar el registro existente
          const { error } = await supabase
            .from('journeys_shared')
            .update({
              status: 'pending'
              // Eliminamos la referencia a groupId que no existe en la tabla
            })
            .eq('id', existingShare.id);

          if (error) throw error;
        }

        // Enviar notificación a cada amigo
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyJourneyInvitation(
          friend.user2Id,
          journeyData.description,
          user.username || 'Usuario',
          cityName,
          startDate,
          endDate,
          invitationData.id,
          generatedJourneyId
        );

        return { success: true };
      });

      // Esperar a que se completen todas las invitaciones
      const results = await Promise.all(invitationPromises);
      
      // Verificar si todas las invitaciones se enviaron correctamente
      const allSuccessful = results.every(result => result.success === true);
      
      if (allSuccessful) {
        Alert.alert(
          'Éxito', 
          `Viaje compartido con ${friends.length} ${friends.length === 1 ? 'amigo' : 'amigos'} en un grupo`
        );
      } else {
        Alert.alert(
          'Información', 
          'Algunos amigos no pudieron ser invitados. Se han enviado las invitaciones posibles.'
        );
      }
      
      navigation.navigate('Missions', {
        journeyId: generatedJourneyId,
        challenges: []
      });
    } catch (error) {
      console.error('Error compartiendo viaje:', error);
      Alert.alert('Error', 'Hubo un problema al compartir el viaje');
    } finally {
      setIsLoading(false);
      setCurrentStep('');
      setShowShareModal(false);
      setGeneratedJourneyId(null);
    }
  };

  const handleSearch = async () => {
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
          updatedDuration, // Usar la duración actualizada
          missionCountNum,
          user.id,
          newStartDate, // Usar las fechas ajustadas
          newEndDate,
          selectedTags // Pasar los tags seleccionados
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
  shareModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
  },
  shareModalContent: {
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
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 5,
  },
  shareModalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
    padding: 5,
  },
  selectAllText: {
    fontSize: 14,
    color: '#005F9E',
    marginRight: 5,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  friendPoints: {
    fontSize: 14,
    color: '#666',
  },
  friendItemSelected: {
    backgroundColor: '#e6f2ff',
    borderRadius: 5,
  },
  footerContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#005F9E',
    padding: 12,
    borderRadius: 5,
    flex: 2,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginBottom: 10,
  },
  closeButton: {
    padding: 5,
  },
});

export default MapScreen; 