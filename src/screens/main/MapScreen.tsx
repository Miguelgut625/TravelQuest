import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Mission } from '../../features/missionSlice';
import Map, { MapMarker } from '../../components/maps';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import generateMission from '../../services/missionGenerator';

const { width, height } = Dimensions.get('window');

// Definir los tipos de las rutas
type RootStackParamList = {
  Missions: { refresh: number; city: string };
  // ... otras rutas si las hay
};

// Añade esta interfaz cerca del inicio del archivo
interface MapMission {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
}

const MapScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
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
  const [missions, setMissions] = useState<MapMission[]>([]);

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

  const handleSearch = async () => {
    const durationNum = parseInt(duration);
    const missionCountNum = parseInt(missionCount);
    
    if (searchCity && durationNum && missionCountNum) {
      try {
        if (!userId) {
          setErrorMsg('Usuario no autenticado');
          return;
        }

        // Generar y guardar las misiones
        await generateMission(searchCity, durationNum, missionCountNum, userId);
        
        // Navegar a la pantalla de misiones con un parámetro para forzar la actualización
        navigation.navigate('Missions', { 
          refresh: Date.now(),
          city: searchCity
        });
      } catch (error) {
        console.error('Error generating missions:', error);
        setErrorMsg('Error al generar misiones');
      }
    } else {
      setErrorMsg('Por favor, ingresa una ciudad, duración y número de misiones válidos.');
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
        >
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
  },
});

export default MapScreen; 