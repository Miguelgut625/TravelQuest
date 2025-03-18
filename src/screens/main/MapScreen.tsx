import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Mission } from '../../features/missionSlice';
import Map, { MapMarker } from '../../components/maps';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp } from '../../types/navigation';
import generateMission from '../../services/missionGenerator';

interface CityMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
}

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
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
  const [cityMarker, setCityMarker] = useState<CityMarker | null>(null);

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
      
      setCityMarker({
        coordinate: { latitude, longitude },
        title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        description: 'Obteniendo nombre de la ciudad...'
      });

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
          setCityMarker(null);
          setSearchCity('');
          return;
        }

        const cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Ubicación desconocida';
        console.log('Nombre de ciudad encontrado:', cityName);

        setCityMarker({
          coordinate: { latitude, longitude },
          title: cityName,
          description: 'Ciudad seleccionada'
        });
        setSearchCity(cityName);
        setErrorMsg(null);
      } else {
        console.log('No se encontraron resultados para las coordenadas');
        setCityMarker({
          coordinate: { latitude, longitude },
          title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
          description: 'Ubicación seleccionada'
        });
        setSearchCity(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error al obtener nombre de la ciudad:', error);
      setErrorMsg('Error al obtener el nombre de la ciudad. Por favor, inténtalo de nuevo.');
      setCityMarker({
        coordinate: { latitude, longitude },
        title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        description: 'Ubicación seleccionada'
      });
      setSearchCity(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
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
        
        setCityMarker({
          coordinate: { 
            latitude: parseFloat(lat), 
            longitude: parseFloat(lon) 
          },
          title: cityName,
          description: 'Ciudad seleccionada'
        });
        
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

  const handleMapPress = (event: any) => {
    console.log('Map pressed:', event.nativeEvent);
    const { coordinate } = event.nativeEvent;
    if (coordinate) {
      const { latitude, longitude } = coordinate;
      // Limpiar el marcador anterior
      setCityMarker(null);
      // Aumentar el delay para asegurar que el marcador anterior se limpie
      setTimeout(() => {
        getCityNameFromCoordinates(latitude, longitude);
      }, 300);
    }
  };

  const handleSearch = async () => {
    const durationNum = parseInt(duration);
    const missionCountNum = parseInt(missionCount);
    
    if (searchCity && durationNum && missionCountNum) {
      try {
        await getCityCoordinates(searchCity);
        await generateMission(searchCity, durationNum, missionCountNum);
        navigation.navigate('Missions');
      } catch (error) {
        console.error('Error:', error);
      }
    } else {
      console.log('Por favor, ingresa una ciudad, duración y número de misiones válidos.');
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
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar Aventuras</Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>
      
      <View style={styles.mapContainer}>
        <Map
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          onPress={handleMapPress}
        >
          {cityMarker && (
            <MapMarker
              key="city-marker"
              coordinate={cityMarker.coordinate}
              title={cityMarker.title}
              description={cityMarker.description}
            />
          )}
          {missions.map((mission) => (
            <MapMarker
              key={mission.id}
              coordinate={mission.location}
              title={mission.title}
              description={mission.description}
            />
          ))}
        </Map>
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
  }
});

export default MapScreen; 