/**
 * JournalScreen.tsx
 * Corrección del ancho de columnas del diario para móviles y web
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import Animated from 'react-native/Libraries/Animated/Animated';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';
import { Ionicons } from '@expo/vector-icons';
import { setRefreshJournal } from '../../features/journalSlice';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import { styles } from './styles';

interface JournalScreenProps {
  route: RouteProp<TabParamList, 'Journal'>;
}

interface JournalEntryFromDB {
  id: string;
  userid: string;
  title: string;
  content: string;
  created_at: string;
  photos?: string[];
  tags?: string[];
  cityid: string;
  cities?: {
    name: string;
  };
}

const JournalEntryCard = ({ entry }: { entry: CityJournalEntry }) => (
  <TouchableOpacity style={styles.journalCard}>
    <Text style={styles.journalCardTitle}>{entry.title}</Text>
    <Text style={styles.journalCardDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
    {entry.missionId && (
      <View style={styles.journalMissionBadge}>
        <Ionicons name="trophy" size={16} color="#4CAF50" />
        <Text style={styles.journalMissionBadgeText}>Misión Completada</Text>
      </View>
    )}
    <Text style={styles.journalCardContent} numberOfLines={3}>
      {entry.content}
    </Text>
    {entry.photos && entry.photos.length > 0 && (
      <View style={styles.journalPhotoGrid}>
        {entry.photos.slice(0, 3).map((photo, index) => (
          <Image
            key={index}
            source={{ uri: photo }}
            style={styles.journalThumbnail}
            resizeMode="cover"
          />
        ))}
        {entry.photos.length > 3 && (
          <View style={styles.journalMorePhotos}>
            <Text style={styles.journalMorePhotosText}>+{entry.photos.length - 3}</Text>
          </View>
        )}
      </View>
    )}
    <View style={styles.journalTags}>
      {entry.tags && entry.tags.map((tag, index) => (
        <Text key={index} style={styles.journalTag}>
          #{tag}
        </Text>
      ))}
    </View>
  </TouchableOpacity>
);

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.journalEmptyContainer}>
    <Ionicons name="journal-outline" size={64} color="#ccc" />
    <Text style={styles.journalEmptyText}>{message}</Text>
  </View>
);

const CityCard = ({ city, entries, onPress }: { city: string; entries: CityJournalEntry[]; onPress: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Recopilar todas las fotos de las entradas de la ciudad
  const allPhotos = entries.reduce<string[]>((photos, entry) => {
    if (entry.photos && entry.photos.length > 0) {
      return [...photos, ...entry.photos];
    }
    return photos;
  }, []);

  // Función para animar el deslizamiento
  const animateSlide = () => {
    // Reset la animación
    slideAnim.setValue(0);
    
    // Animar hacia la izquierda
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setCurrentImageIndex(nextImageIndex);
      setNextImageIndex((nextImageIndex + 1) % allPhotos.length);
      slideAnim.setValue(0);
    });
  };

  // Efecto para el carrusel automático
  useEffect(() => {
    if (allPhotos.length <= 1) return;

    const interval = setInterval(() => {
      animateSlide();
    }, 4000);

    return () => clearInterval(interval);
  }, [allPhotos.length, nextImageIndex]);

  return (
    <TouchableOpacity style={styles.journalCityCard} onPress={onPress}>
      {allPhotos.length > 0 ? (
        <>
          <View style={styles.journalCarouselContainer}>
            <Animated.View
              style={[
                styles.journalImageContainer,
                {
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -Dimensions.get('window').width]
                    })
                  }]
                }
              ]}
            >
              <Image
                source={{ uri: allPhotos[currentImageIndex] }}
                style={styles.journalCityCardBackground}
                resizeMode="cover"
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.journalImageContainer,
                {
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Dimensions.get('window').width, 0]
                    })
                  }]
                }
              ]}
            >
              <Image
                source={{ uri: allPhotos[nextImageIndex] }}
                style={styles.journalCityCardBackground}
                resizeMode="cover"
              />
            </Animated.View>
          </View>
          {allPhotos.length > 1 && (
            <View style={styles.journalCarouselDots}>
              {allPhotos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.journalDot,
                    index === currentImageIndex && styles.journalActiveDot
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.journalNoImageBackground}>
          <Ionicons name="image-outline" size={32} color="#666" />
        </View>
      )}
      <View style={styles.journalCityCardOverlay} />
      <View style={styles.journalCityCardContent}>
        <View style={styles.journalTextContainer}>
          <Ionicons name="location" size={32} color="#fff" />
          <Text style={styles.journalCityName}>{city}</Text>
          <Text style={styles.journalViewMissionsText}>Ver misiones ({entries.length})</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const transformEntryToCityJournalEntry = (entry: JournalEntryFromDB): CityJournalEntry => {
  return {
    id: entry.id,
    userId: entry.userid,
    cityId: entry.cityid,
    title: entry.title,
    content: entry.content,
    photos: entry.photos || [],
    location: null,
    created_at: entry.created_at,
    tags: entry.tags || [],
    city_name: entry.cities?.name || 'Sin ciudad'
  };
};

const fetchWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

const JournalScreen = ({ route }: JournalScreenProps) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [entriesByCity, setEntriesByCity] = useState<{ [cityName: string]: CityJournalEntry[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cities' | 'entries'>('cities');
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { shouldRefresh } = useSelector((state: RootState) => state.journal);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  
  useEffect(() => {
    fetchJournalEntries();
    
    // Suscribirse a cambios en la tabla journal_entries
    const journalSubscription = supabase
      .channel('journal_changes')
      .on('postgres_changes', { 
        event: '*', // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
        schema: 'public', 
        table: 'journal_entries',
        filter: `userid=eq.${user?.id}`
      }, (payload: any) => {
        console.log('Cambio detectado en el diario:', payload);
        fetchJournalEntries();
      })
      .subscribe();
      
    // Limpiar suscripción
    return () => {
      supabase.removeChannel(journalSubscription);
    };
  }, []);
  
  useEffect(() => {
    if (shouldRefresh) {
      console.log('Actualizando entradas del diario debido a nueva misión completada');
      fetchJournalEntries();
      dispatch(setRefreshJournal(false));
    }
  }, [shouldRefresh]);

  // Detectar el parámetro refresh
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('Actualizando entradas del diario debido a nueva misión completada');
      fetchJournalEntries();
      // Limpiar el parámetro para evitar actualizaciones repetidas
      if (navigation.setParams) {
        navigation.setParams({ refresh: undefined });
      }
    }
  }, [route.params?.refresh]);

  const fetchJournalEntries = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Primero, intentar obtener la estructura de la tabla
      const { data: tableInfo, error: tableError } = await supabase
        .from('journal_entries')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Error al verificar la estructura de la tabla:', tableError);
        throw tableError;
      }

      // Intentar diferentes variaciones de la consulta
      let data;
      let error;

      // Intento 1: Consulta con relación cities
      const { data: data1, error: error1 } = await supabase
        .from('journal_entries')
        .select(`
          *,
          cities (
            name
          )
        `)
        .eq('userid', user.id)
        .order('created_at', { ascending: false });

      if (!error1) {
        data = data1;
      } else {
        console.log('Primer intento fallido, probando alternativa:', error1);
        
        // Intento 2: Consulta básica sin relación
        const { data: data2, error: error2 } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('userid', user.id)
          .order('created_at', { ascending: false });

        if (!error2) {
          data = data2;
        } else {
          console.log('Segundo intento fallido:', error2);
          error = error2;
        }
      }

      if (error) throw error;
      if (!data) throw new Error('No se pudieron obtener los datos');

      // Organizar entradas por ciudad
      const entriesByCityMap: { [key: string]: CityJournalEntry[] } = {};
      
      for (const entry of data) {
        let cityName = 'Sin ciudad';
        
        // Intentar obtener el nombre de la ciudad de diferentes maneras
        if (entry.cities?.name) {
          cityName = entry.cities.name;
        } else if (entry.city_name) {
          cityName = entry.city_name;
        } else if (entry.cityName) {
          cityName = entry.cityName;
        } else if (entry.cityid) {
          // Si tenemos cityid pero no el nombre, intentar obtenerlo
          try {
            const { data: cityData } = await supabase
              .from('cities')
              .select('name')
              .eq('id', entry.cityid)
              .single();
            
            if (cityData?.name) {
              cityName = cityData.name;
            }
          } catch (e) {
            console.warn('No se pudo obtener el nombre de la ciudad:', e);
          }
        }

        if (!entriesByCityMap[cityName]) {
          entriesByCityMap[cityName] = [];
        }

        // Transformar la entrada
        const transformedEntry = transformEntryToCityJournalEntry({
          ...entry,
          cities: { name: cityName }
        });

        entriesByCityMap[cityName].push(transformedEntry);
      }

      setEntriesByCity(entriesByCityMap);
    } catch (error) {
      console.error('Error al cargar entradas del diario:', error);
      setError('No se pudieron cargar las entradas del diario');
    } finally {
      setLoading(false);
    }
  };

  const handleCityPress = (city: string) => {
    setSelectedCity(city);
    setViewMode('entries');
  };

  const handleBackPress = () => {
    setSelectedCity(null);
    setViewMode('cities');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.journalLoadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.journalLoadingText}>Cargando diario...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.journalErrorContainer}>
          <Text style={styles.journalErrorText}>{error}</Text>
          <TouchableOpacity style={styles.journalRetryButton} onPress={fetchJournalEntries}>
            <Text style={styles.journalRetryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const cities = Object.keys(entriesByCity);

    if (viewMode === 'entries' && selectedCity) {
      return (
        <View style={styles.journalContainer}>
          <View style={styles.journalHeader}>
            <TouchableOpacity onPress={handleBackPress} style={styles.journalBackButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.journalTitle}>{selectedCity}</Text>
          </View>
          
          {entriesByCity[selectedCity].length === 0 ? (
            <EmptyState message={`No hay entradas de diario para ${selectedCity}`} />
          ) : (
            <FlatList
              key="entries"
              data={entriesByCity[selectedCity]}
              renderItem={({ item }) => <JournalEntryCard entry={item} />}
              keyExtractor={(item) => item.id}
              style={styles.journalEntriesList}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.journalContainer}>
        <Text style={styles.journalTitle}>Ciudades Disponibles</Text>
        {cities.length === 0 ? (
          <View style={styles.journalEmptyContainer}>
            <Ionicons name="map-outline" size={64} color="#ccc" />
            <Text style={styles.journalEmptyText}>
              No hay ciudades disponibles todavía.
            </Text>
          </View>
        ) : (
          <FlatList
            key="cities"
            data={cities}
            renderItem={({ item }) => (
              <CityCard
                city={item}
                entries={entriesByCity[item]}
                onPress={() => handleCityPress(item)}
              />
            )}
            keyExtractor={(item) => item}
            numColumns={Platform.OS === 'web' ? 4 : 1}
            contentContainerStyle={styles.journalCityGrid}
          />
        )}
      </View>
    );
  };

  return renderContent();
};

export default JournalScreen; 