import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map from '../../components/maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp } from '../../types/navigation';
import generateMission from '../../services/missionGenerator';

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

const { height } = Dimensions.get('window');

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
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <Text style={styles.headerText}>Localiza tu ciudad</Text>
      </LinearGradient>

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
        <Map initialRegion={region} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
  },
  header: {
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: colors.secondary,
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 5,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    height: Platform.OS === 'web' ? height * 0.6 : height * 0.5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default MapScreen;