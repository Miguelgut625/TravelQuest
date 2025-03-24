import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Mission } from '../../features/missionSlice';
import Map from '../../components/maps';
import { MapMarker } from '../../components/maps/index';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp } from '../../types/navigation';
import generateMission from '../../services/missionGenerator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../services/supabase';
import { setCityMissionData } from '../../features/cityMissionSlice';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<MainTabNavigationProp>();
  const [region, setRegion] = useState({
    latitude: 40.416775,
    longitude: -3.703790,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchCity, setSearchCity] = useState('');
  const [duration, setDuration] = useState('');
  const [missionCount, setMissionCount] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const cityMarker = useSelector((state: RootState) => state.cityMission.cityMarker);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const [cityId, setCityId] = useState<string | null>(null);

  const missionsFromRedux = useSelector((state: RootState) => state.missions.missions);

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

  const getCityNameFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      console.log('Obteniendo nombre de ciudad para coordenadas:', latitude, longitude);
      
      dispatch(setCityMissionData({
        cityMarker: {
          coordinate: { latitude, longitude },
          title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
          description: 'Obteniendo nombre de la ciudad...'
        }
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`,
        {
          headers: {
            'User-Agent': 'TravelQuest/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error de la API: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta de la API:', data);
      
      if (data.address) {
        // Verificar si la ubicación está en España
        if (data.address.country_code !== 'es') {
          setErrorMsg('Esta ubicación está fuera de nuestra zona de influencia. Por favor, selecciona una ciudad en España.');
          dispatch(setCityMissionData({
            cityMarker: null
          }));
          setSearchCity('');
          return;
        }

        const cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Ubicación desconocida';
        console.log('Nombre de ciudad encontrado:', cityName);

        dispatch(setCityMissionData({
          cityMarker: {
            coordinate: { latitude, longitude },
            title: cityName,
            description: 'Ciudad seleccionada'
          }
        }));
        setSearchCity(cityName);
        setErrorMsg(null);
      } else {
        console.log('No se encontraron resultados para las coordenadas');
        dispatch(setCityMissionData({
          cityMarker: {
            coordinate: { latitude, longitude },
            title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            description: 'Ubicación seleccionada'
          }
        }));
        setSearchCity(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error al obtener nombre de la ciudad:', error);
      setErrorMsg('Error al obtener el nombre de la ciudad. Por favor, inténtalo de nuevo.');
      dispatch(setCityMissionData({
        cityMarker: {
          coordinate: { latitude, longitude },
          title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
          description: 'Ubicación seleccionada'
        }
      }));
      setSearchCity(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    }
  };

  const handleMapPress = (event: any) => {
    console.log('Map pressed:', event.nativeEvent);
    const { coordinate } = event.nativeEvent;
    if (coordinate) {
      const { latitude, longitude } = coordinate;
      // Limpiar el marcador anterior
      dispatch(setCityMissionData({
        cityMarker: null
      }));
      // Aumentar el delay para asegurar que el marcador anterior se limpie
      setTimeout(() => {
        getCityNameFromCoordinates(latitude, longitude);
      }, 300);
    }
  };

  const getCityCoordinates = async (cityName: string) => {
    try {
      console.log('Buscando coordenadas para:', cityName);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1&accept-language=es&featuretype=city&countrycodes=es`,
        {
          headers: {
            'User-Agent': 'TravelQuest/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error de la API: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta de la API:', data);
      
      if (data && data[0]) {
        const { lat, lon } = data[0];
        const cityName = data[0].address.city || data[0].address.town || data[0].address.village || data[0].display_name.split(',')[0];
        console.log('Nombre de ciudad encontrado:', cityName);
        
        dispatch(setCityMissionData({
          cityMarker: {
            coordinate: { 
              latitude: parseFloat(lat), 
              longitude: parseFloat(lon) 
            },
            title: cityName,
            description: 'Ciudad seleccionada'
          }
        }));
        
        setRegion({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        
        setSearchCity(cityName);
        setErrorMsg(null);
      } else {
        setErrorMsg('No se encontró la ciudad en España. Por favor, intenta con otra ciudad.');
      }
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      setErrorMsg('Error al obtener las coordenadas de la ciudad');
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log('Evento DatePicker inicio:', event);
    console.log('Fecha seleccionada inicio:', selectedDate);
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log('Evento DatePicker fin:', event);
    console.log('Fecha seleccionada fin:', selectedDate);
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleSearch = async () => {
    const durationNum = parseInt(duration);
    const missionCountNum = parseInt(missionCount);
    
    // Validación específica de campos
    if (!searchCity) {
      setErrorMsg('Por favor, selecciona una ciudad');
      return;
    }
    if (!missionCountNum) {
      setErrorMsg('Por favor, ingresa el número de misiones');
      return;
    }
    if (!user?.id) {
      setErrorMsg('Error: No hay usuario autenticado');
      return;
    }

    try {
      // Primero obtenemos el ID de la ciudad
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('id')
        .eq('name', searchCity)
        .single();

      if (cityError) {
        throw new Error('Error al obtener el ID de la ciudad');
      }

      if (!cityData) {
        setErrorMsg('No se encontró la ciudad en la base de datos');
        return;
      }

      setCityId(cityData.id);

      await getCityCoordinates(searchCity);
      //ZONA INICIO
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      // Calcular la duración en días
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      if (!Number.isInteger(durationInDays) || durationInDays <= 0) {
        setErrorMsg('La duración debe ser un número entero positivo.');
        return;
      }

      // Generar la descripción
      const generatedDescription = `Viaje a ${searchCity} por ${durationInDays} días`;

      // Crear el journey con el ID del usuario actual
      const { error: journeyError } = await supabase
        .from('journeys')
        .insert({
          description: generatedDescription,
          start_date: startDateString,
          end_date: endDateString,
          cityId: cityData.id,
          userId: user.id
        });

      if (journeyError) {
        throw journeyError;
      }

      //ZONA FIN
      await generateMission(searchCity, durationNum, missionCountNum);
      navigation.navigate('Missions');
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Error al crear la aventura. Por favor, inténtalo de nuevo.');
    }
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
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => {
            console.log('Abriendo DatePicker inicio');
            setShowStartDatePicker(true);
          }}
        >
          <Text>Fecha inicio: {startDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartDateChange}
            minimumDate={new Date()}
            maximumDate={endDate}
          />
        )}
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => {
            console.log('Abriendo DatePicker fin');
            setShowEndDatePicker(true);
          }}
        >
          <Text>Fecha fin: {endDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndDateChange}
            minimumDate={startDate}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Número de misiones"
          value={missionCount}
          onChangeText={setMissionCount}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar Aventuras</Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>
      
      <View style={styles.mapContainer}>
        <Map
          initialRegion={region}
          markers={[
            ...(cityMarker ? [cityMarker] : []),
            ...missions.map((mission) => ({
              coordinate: mission.location,
              title: mission.title,
              description: mission.description
            }))
          ]}
          onMarkerPress={(marker) => {
            console.log('Marker pressed in MapScreen:', marker);
            handleMapPress({ nativeEvent: marker });
          }}
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
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    height: Platform.OS === 'web' ? height * 0.6 : height * 0.5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  dateButton: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});

export default MapScreen; 