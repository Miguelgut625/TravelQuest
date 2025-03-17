import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Dimensions, Platform, FlatList } from 'react-native';
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

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
  };
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
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      
      // Primero mostrar las coordenadas mientras se obtiene el nombre
      setCityMarker({
        coordinate: { latitude, longitude },
        title: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        description: 'Obteniendo nombre de la ciudad...'
      });

      // Agregar un delay para respetar los límites de la API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`,
        {
          headers: {
            'User-Agent': 'TravelQuest/1.0' // Identificador para la API
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error de la API: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta de la API:', data);
      
      if (data.address) {
        const cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Ubicación desconocida';
        console.log('Nombre de ciudad encontrado:', cityName);

        setCityMarker({
          coordinate: { latitude, longitude },
          title: cityName,
          description: 'Ciudad seleccionada'
        });
        setSearchCity(cityName);
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
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=AIzaSyBIcgxbRUUIOuQ01SdaiBh-vZh4b2pDHGI`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        setCityMarker({
          coordinate: { latitude: lat, longitude: lng },
          title: cityName,
          description: 'Ciudad seleccionada'
        });
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
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

  const getCitySuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&addressdetails=1&accept-language=es&featuretype=city&countrycodes=es,fr,it,de,pt,uk,us,ca,au,nz,ar,br,cl,co,mx,pe,ve,ec,bo,py,uy,cr,pa,do,pr,gt,hn,sv,ni,cu,ht,jm,tr,gr,ru,cn,jp,kr,in,th,vn,my,sg,id,ae,sa,qa,bh,kw,om,ye,eg,ma,dz,tn,ly,dz,ma,ke,za,ng,gh,ci,cm,sen`,
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
      
      // Filtrar y ordenar resultados por relevancia
      const cities = data
        .filter((item: any) => {
          // Verificar que sea una ciudad
          const isCity = item.type === 'city' || 
                        item.class === 'place' || 
                        (item.address && (item.address.city || item.address.town || item.address.village));
          
          // Verificar que el nombre coincida con la búsqueda
          const searchTerm = query.toLowerCase();
          const displayName = item.display_name.toLowerCase();
          const addressName = (item.address?.city || item.address?.town || item.address?.village || '').toLowerCase();
          
          // Priorizar coincidencias exactas
          const exactMatch = addressName === searchTerm || displayName === searchTerm;
          const partialMatch = displayName.includes(searchTerm) || addressName.includes(searchTerm);
          
          return isCity && (exactMatch || partialMatch);
        })
        .map((item: any) => ({
          ...item,
          display_name: item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0],
          relevance: item.address?.city === query || item.address?.town === query || item.address?.village === query ? 0 : 1
        }))
        .sort((a: any, b: any) => a.relevance - b.relevance)
        .slice(0, 5);

      setSuggestions(cities);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error al obtener sugerencias:', error);
    }
  };

  const handleCitySelect = (suggestion: CitySuggestion) => {
    const cityName = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.display_name.split(',')[0];
    setSearchCity(cityName);
    setSuggestions([]);
    setShowSuggestions(false);
    setCityMarker({
      coordinate: { 
        latitude: parseFloat(suggestion.lat), 
        longitude: parseFloat(suggestion.lon) 
      },
      title: cityName,
      description: 'Ciudad seleccionada'
    });
    setRegion({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Buscar ciudad"
            value={searchCity}
            onChangeText={(text) => {
              setSearchCity(text);
              getCitySuggestions(text);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleCitySelect(item)}
                >
                  <Text>{item.display_name}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
            />
          )}
        </View>
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
  },
  searchInputContainer: {
    position: 'relative',
    zIndex: 2,
  },
  suggestionsList: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default MapScreen; 