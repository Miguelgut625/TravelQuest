import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';
import { Ionicons } from '@expo/vector-icons';
import { setRefreshJournal } from '../../features/journalSlice';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';

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
  <TouchableOpacity style={styles.card}>
    <Text style={styles.cardTitle}>{entry.title}</Text>
    <Text style={styles.cardDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
    <Text style={styles.cardContent} numberOfLines={3}>
      {entry.content}
    </Text>
    {entry.photos && entry.photos.length > 0 && (
      <View style={styles.photoGrid}>
        {entry.photos.slice(0, 3).map((photo, index) => (
          <Image
            key={index}
            source={{ uri: photo }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ))}
        {entry.photos.length > 3 && (
          <View style={styles.morePhotos}>
            <Text style={styles.morePhotosText}>+{entry.photos.length - 3}</Text>
          </View>
        )}
      </View>
    )}
    <View style={styles.tags}>
      {entry.tags && entry.tags.map((tag, index) => (
        <Text key={index} style={styles.tag}>
          #{tag}
        </Text>
      ))}
    </View>
  </TouchableOpacity>
);

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="journal-outline" size={64} color="#ccc" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const CityCard = ({ city, entries, onPress }: { city: string; entries: CityJournalEntry[]; onPress: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Recopilar todas las fotos de las entradas de la ciudad
  const allPhotos = entries.reduce<string[]>((photos, entry) => {
    if (entry.photos && entry.photos.length > 0) {
      return [...photos, ...entry.photos];
    }
    return photos;
  }, []);

  // Efecto para el carrusel automático
  useEffect(() => {
    if (allPhotos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === allPhotos.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Cambiar imagen cada 3 segundos

    return () => clearInterval(interval);
  }, [allPhotos.length]);

  return (
    <TouchableOpacity style={styles.cityCard} onPress={onPress}>
      {allPhotos.length > 0 ? (
        <>
          <Image
            source={{ uri: allPhotos[currentImageIndex] }}
            style={styles.cityCardBackground}
            resizeMode="cover"
          />
          {allPhotos.length > 1 && (
            <View style={styles.carouselDots}>
              {allPhotos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.activeDot
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noImageBackground}>
          <Ionicons name="image-outline" size={32} color="#666" />
        </View>
      )}
      <View style={styles.cityCardOverlay} />
      <View style={styles.cityCardContent}>
        <Ionicons name="location" size={32} color="#fff" />
        <Text style={styles.cityName}>{city}</Text>
        <Text style={styles.viewMissionsText}>Ver misiones ({entries.length})</Text>
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
        event: 'INSERT', 
        schema: 'public', 
        table: 'journal_entries',
        filter: `userid=eq.${user?.id}`
      }, (payload: any) => {
        console.log('Nueva entrada de diario detectada:', payload);
        // Actualizar los datos
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando diario...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchJournalEntries}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const cities = Object.keys(entriesByCity);

    if (viewMode === 'entries' && selectedCity) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{selectedCity}</Text>
          </View>
          
          {entriesByCity[selectedCity].length === 0 ? (
            <EmptyState message={`No hay entradas de diario para ${selectedCity}`} />
          ) : (
            <FlatList
              key="entries"
              data={entriesByCity[selectedCity]}
              renderItem={({ item }) => <JournalEntryCard entry={item} />}
              keyExtractor={(item) => item.id}
              style={styles.entriesList}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ciudades Disponibles</Text>
        {cities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
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
            numColumns={4}
            columnWrapperStyle={styles.cityGrid}
          />
        )}
      </View>
    );
  };

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  cityTabs: {
    marginBottom: 20,
  },
  cityTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedCityTab: {
    backgroundColor: '#4CAF50',
  },
  cityTabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  selectedCityTabText: {
    color: 'white',
  },
  entriesList: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDate: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
  },
  cardContent: {
    color: '#333',
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 5,
  },
  morePhotos: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#4CAF50',
    marginRight: 10,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  cityCard: {
    width: '20%',
    aspectRatio: 1,
    backgroundColor: '#333',
    borderRadius: 15,
    margin: '2.5%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  cityCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cityCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  cityCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  cityName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  viewMissionsText: {
    color: '#fff',
    marginTop: 4,
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cityGrid: {
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingHorizontal: '2.5%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noImageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default JournalScreen; 