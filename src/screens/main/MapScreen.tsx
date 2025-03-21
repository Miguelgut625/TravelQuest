import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map, { MapMarker } from '../../components/maps';
import * as Location from 'expo-location';
import { getMissionsByCityAndDuration } from '../../services/missionService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import generateMission from '../../services/missionGenerator';

type RootStackParamList = {
  Missions: {
    journeyId: string;
    challenges: any[];
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
});

export default MapScreen; 