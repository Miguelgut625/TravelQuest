import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Map from '../../components/maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp } from '../../types/navigation';
import generateMission from '../../services/missionGenerator';

const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

const { height } = Dimensions.get('window');

const MapScreen = () => {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  const dynamicStyles = getDynamicStyles(isSmallScreen);

  const [region, setRegion] = useState({
    latitude: 40.416775,
    longitude: -3.70379,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [searchCity, setSearchCity] = useState('');
  const [duration, setDuration] = useState('');
  const [missionCount, setMissionCount] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userId = useSelector((state: RootState) => state.auth.user?.id);

  useEffect(() => {
    (async () => {
      try {
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
      } catch (error) {
        setErrorMsg('Error al obtener la ubicación');
      }
    })();
  }, []);

  const handleSearch = async () => {
    const durationNum = parseInt(duration);
    const missionCountNum = parseInt(missionCount);

    if (!searchCity.trim() || isNaN(durationNum) || isNaN(missionCountNum)) {
      setErrorMsg('Por favor, ingresa una ciudad, duración y número de misiones válidos.');
      return;
    }

    if (!userId) {
      setErrorMsg('Usuario no identificado.');
      return;
    }

    try {
      await generateMission(searchCity, durationNum, missionCountNum, userId);
      navigation.navigate('Missions');
    } catch (error) {
      setErrorMsg('Error al generar misiones. Inténtalo de nuevo.');
      console.error('Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={dynamicStyles.logo} />
        </View>
        <Text style={dynamicStyles.headerText}>Localiza tu ciudad</Text>
      </LinearGradient>

      <View style={dynamicStyles.searchContainer}>
        <TextInput
          style={dynamicStyles.input}
          placeholder="Buscar ciudad"
          value={searchCity}
          onChangeText={setSearchCity}
        />
        <TextInput
          style={dynamicStyles.input}
          placeholder="Duración (días)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />
        <TextInput
          style={dynamicStyles.input}
          placeholder="Número de misiones"
          value={missionCount}
          onChangeText={setMissionCount}
          keyboardType="numeric"
        />
        <TouchableOpacity style={dynamicStyles.button} onPress={handleSearch}>
          <Text style={dynamicStyles.buttonText}>Buscar Aventuras</Text>
        </TouchableOpacity>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={dynamicStyles.mapContainer}>
        <Map initialRegion={region} />
      </View>
    </View>
  );
};

const getDynamicStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    logo: {
      width: isSmallScreen ? 60 : 100,
      height: isSmallScreen ? 60 : 100,
      resizeMode: 'contain',
    },
    headerText: {
      color: colors.secondary,
      fontSize: isSmallScreen ? 18 : 22,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    searchContainer: {
      backgroundColor: colors.secondary,
      padding: isSmallScreen ? 10 : 15,
      margin: 10,
      borderRadius: 10,
      elevation: 5,
    },
    input: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 5,
      marginBottom: 10,
      paddingHorizontal: 10,
      fontSize: isSmallScreen ? 14 : 16,
      backgroundColor: colors.secondary,
    },
    button: {
      backgroundColor: colors.primary,
      padding: isSmallScreen ? 12 : 15,
      borderRadius: 5,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.secondary,
      fontWeight: 'bold',
      fontSize: isSmallScreen ? 14 : 16,
    },
    mapContainer: {
      flex: 1,
      margin: 10,
      height: Platform.OS === 'web'
        ? height * 0.6
        : isSmallScreen
        ? height * 0.4
        : height * 0.5,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
      elevation: 5,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
  },
  header: {
    paddingVertical: 45,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
  errorText: {
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default MapScreen;
