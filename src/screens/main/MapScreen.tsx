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

interface CityMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
}

interface FormState {
  searchCity: string;
  missionCount: string;
  description: string;
  errorMsg: string | null;
}

interface DateState {
  start: Date;
  end: Date;
  showStartPicker: boolean;
  showEndPicker: boolean;
}

interface MapState {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  cityMarker: CityMarker | null;
  missions: Mission[];
}

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const missionsFromRedux = useSelector((state: RootState) => state.missions.missions);

  // Estados agrupados
  const [form, setForm] = useState<FormState>({
    searchCity: '',
    missionCount: '',
    description: '',
    errorMsg: null
  });

  const [dates, setDates] = useState<DateState>({
    start: new Date(),
    end: new Date(),
    showStartPicker: false,
    showEndPicker: false
  });

  const [map, setMap] = useState<MapState>({
    region: {
      latitude: 40.416775,
      longitude: -3.703790,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
    cityMarker: null,
    missions: []
  });

  const [cityId, setCityId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setForm(prev => ({ ...prev, errorMsg: 'Se requiere permiso para acceder a la ubicación' }));
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setMap(prev => ({
        ...prev,
        region: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }
      }));
    })();
  }, []);

  const getCityNameFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      console.log('Obteniendo nombre de ciudad para coordenadas:', latitude, longitude);
      
      setMap(prev => ({
        ...prev,
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
        if (data.address.country_code !== 'es') {
          setForm(prev => ({ ...prev, errorMsg: 'Esta ubicación está fuera de nuestra zona de influencia. Por favor, selecciona una ciudad en España.' }));
          setMap(prev => ({ ...prev, cityMarker: null }));
          setForm(prev => ({ ...prev, searchCity: '' }));
          return;
        }

        const cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Ubicación desconocida';
        console.log('Nombre de ciudad encontrado:', cityName);

        setMap(prev => ({
          ...prev,
          cityMarker: {
            coordinate: { latitude, longitude },
            title: cityName,
            description: 'Ciudad seleccionada'
          }
        }));
        setForm(prev => ({ ...prev, searchCity: cityName, errorMsg: null }));
      } else {
        console.log('No se encontraron resultados para las coordenadas');
        setMap(prev => ({
          ...prev,
          cityMarker: {
            coordinate: { latitude, longitude },
            title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            description: 'Ubicación seleccionada'
          }
        }));
        setForm(prev => ({ ...prev, searchCity: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` }));
      }
    } catch (error) {
      console.error('Error al obtener nombre de la ciudad:', error);
      setForm(prev => ({ ...prev, errorMsg: 'Error al obtener el nombre de la ciudad. Por favor, inténtalo de nuevo.' }));
      setMap(prev => ({
        ...prev,
        cityMarker: {
          coordinate: { latitude, longitude },
          title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
          description: 'Ubicación seleccionada'
        }
      }));
      setForm(prev => ({ ...prev, searchCity: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` }));
    }
  };

  const handleMapPress = (event: any) => {
    console.log('Map pressed:', event.nativeEvent);
    const { coordinate } = event.nativeEvent;
    if (coordinate) {
      const { latitude, longitude } = coordinate;
      setMap(prev => ({ ...prev, cityMarker: null }));
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
        
        setMap(prev => ({
          ...prev,
          cityMarker: {
            coordinate: { 
              latitude: parseFloat(lat), 
              longitude: parseFloat(lon) 
            },
            title: cityName,
            description: 'Ciudad seleccionada'
          }
        }));
        
        setMap(prev => ({
          ...prev,
          region: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
        }));
        
        setForm(prev => ({ ...prev, searchCity: cityName, errorMsg: null }));
      } else {
        setForm(prev => ({ ...prev, errorMsg: 'No se encontró la ciudad en España. Por favor, intenta con otra ciudad.' }));
      }
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      setForm(prev => ({ ...prev, errorMsg: 'Error al obtener las coordenadas de la ciudad' }));
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log('Evento DatePicker inicio:', event);
    console.log('Fecha seleccionada inicio:', selectedDate);
    if (Platform.OS === 'android') {
      setDates(prev => ({ ...prev, showStartPicker: false }));
    }
    if (selectedDate) {
      setDates(prev => ({
        ...prev,
        start: selectedDate,
        end: selectedDate > prev.end ? selectedDate : prev.end
      }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log('Evento DatePicker fin:', event);
    console.log('Fecha seleccionada fin:', selectedDate);
    if (Platform.OS === 'android') {
      setDates(prev => ({ ...prev, showEndPicker: false }));
    }
    if (selectedDate) {
      setDates(prev => ({ ...prev, end: selectedDate }));
    }
  };

  const handleSearch = async () => {
    const missionCountNum = parseInt(form.missionCount);
    
    // Validación específica de campos
    if (!form.searchCity) {
      setForm(prev => ({ ...prev, errorMsg: 'Por favor, selecciona una ciudad' }));
      return;
    }
    if (!missionCountNum) {
      setForm(prev => ({ ...prev, errorMsg: 'Por favor, ingresa el número de misiones' }));
      return;
    }
    if (!user?.id) {
      setForm(prev => ({ ...prev, errorMsg: 'Error: No hay usuario autenticado' }));
      return;
    }
    if (!form.description) {
      setForm(prev => ({ ...prev, errorMsg: 'Por favor, ingresa una descripción de la aventura' }));
      return;
    }

    try {
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('id')
        .eq('name', form.searchCity)
        .single();

      if (cityError) {
        throw new Error('Error al obtener el ID de la ciudad');
      }

      if (!cityData) {
        setForm(prev => ({ ...prev, errorMsg: 'No se encontró la ciudad en la base de datos' }));
        return;
      }

      setCityId(cityData.id);

      await getCityCoordinates(form.searchCity);
      const startDateString = dates.start.toISOString().split('T')[0];
      const endDateString = dates.end.toISOString().split('T')[0];

      const { error: journeyError } = await supabase
        .from('journeys')
        .insert({
          description: form.description,
          start_date: startDateString,
          end_date: endDateString,
          cityId: cityData.id,
          userId: user.id
        });

      if (journeyError) {
        throw journeyError;
      }

      await generateMission(form.searchCity, 1, missionCountNum);
      navigation.navigate('Missions');
    } catch (error) {
      console.error('Error:', error);
      setForm(prev => ({ ...prev, errorMsg: 'Error al crear la aventura. Por favor, inténtalo de nuevo.' }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar ciudad"
          value={form.searchCity}
          onChangeText={(text) => setForm(prev => ({ ...prev, searchCity: text }))}
        />
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => {
            console.log('Abriendo DatePicker inicio');
            setDates(prev => ({ ...prev, showStartPicker: true }));
          }}
        >
          <Text>Fecha inicio: {dates.start.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {dates.showStartPicker && (
          <DateTimePicker
            value={dates.start}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartDateChange}
            minimumDate={new Date()}
            maximumDate={dates.end}
          />
        )}
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => {
            console.log('Abriendo DatePicker fin');
            setDates(prev => ({ ...prev, showEndPicker: true }));
          }}
        >
          <Text>Fecha fin: {dates.end.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {dates.showEndPicker && (
          <DateTimePicker
            value={dates.end}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndDateChange}
            minimumDate={dates.start}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Número de misiones"
          value={form.missionCount}
          onChangeText={(text) => setForm(prev => ({ ...prev, missionCount: text }))}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Descripción de la aventura"
          value={form.description}
          onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar Aventuras</Text>
        </TouchableOpacity>
        {form.errorMsg ? <Text style={styles.errorText}>{form.errorMsg}</Text> : null}
      </View>
      
      <View style={styles.mapContainer}>
        <Map
          initialRegion={map.region}
          markers={[
            ...(map.cityMarker ? [map.cityMarker] : []),
            ...map.missions.map((mission) => ({
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