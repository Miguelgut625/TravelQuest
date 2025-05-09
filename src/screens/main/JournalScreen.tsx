// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';
import { Ionicons } from '@expo/vector-icons';
import { setRefreshJournal } from '../../features/journalSlice';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface JournalScreenProps {
  route: RouteProp<TabParamList, 'Journal'>;
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
    {/* @ts-ignore */}
    <Ionicons name="journal-outline" size={64} color="#ccc" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const CityCard = ({ city, entries, onPress }: { city: string; entries: CityJournalEntry[]; onPress: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const allPhotos = entries.reduce<string[]>((photos, entry) => {
    if (entry.photos && entry.photos.length > 0) {
      return [...photos, ...entry.photos];
    }
    return photos;
  }, []);

  const animateSlide = () => {
    slideAnim.setValue(0);
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

  useEffect(() => {
    if (allPhotos.length <= 1) return;

    const interval = setInterval(() => {
      animateSlide();
    }, 4000);

    return () => clearInterval(interval);
  }, [allPhotos.length, nextImageIndex]);

  return (
    <TouchableOpacity style={styles.cityCard} onPress={onPress}>
      {allPhotos.length > 0 ? (
        <View style={styles.carouselContainer}>
          <Animated.View
            style={[
              styles.imageContainer,
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
              style={styles.cityCardBackground}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.imageContainer,
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
              style={styles.cityCardBackground}
              resizeMode="cover"
            />
          </Animated.View>
          <View style={styles.cityCardOverlay} />
        </View>
      ) : (
        <View style={styles.noImageBackground}>
          <Ionicons name="image-outline" size={32} color="#666" />
        </View>
      )}
      <View style={styles.textContainer}>
        <Ionicons name="location" size={32} color="#fff" />
        <Text style={styles.cityName}>{city}</Text>
        <Text style={styles.viewMissionsText}>Ver misiones ({entries.length})</Text>
      </View>
    </TouchableOpacity>
  );
};

const JournalScreen = ({ route }: JournalScreenProps) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [entriesByCity, setEntriesByCity] = useState<{ [cityName: string]: CityJournalEntry[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);

  const { user } = useSelector((state: RootState) => state.auth);
  const { shouldRefresh } = useSelector((state: RootState) => state.journal);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const windowWidth = Dimensions.get('window').width;
  const CARD_WIDTH = windowWidth - 60; // Reducimos el margen total (30px a cada lado)

  const insets = useSafeAreaInsets();

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
      const entries = await getUserJournalEntries(user.id);
      setEntriesByCity(entries);

      // Si hay entradas, seleccionar la primera ciudad por defecto
      const cities = Object.keys(entries);
      if (cities.length > 0 && !selectedCity) {
        setSelectedCity(cities[0]);
      }
    } catch (error) {
      console.error('Error al cargar entradas del diario:', error);
      setError('No se pudieron cargar las entradas del diario');
    } finally {
      setLoading(false);
    }
  };

  const handleNextCity = () => {
    const cities = Object.keys(entriesByCity);
    if (currentCityIndex < cities.length - 1) {
      const nextIndex = currentCityIndex + 1;
      setCurrentCityIndex(nextIndex);
      setSelectedCity(cities[nextIndex]);
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * windowWidth,
        animated: true
      });
    }
  };

  const handlePrevCity = () => {
    if (currentCityIndex > 0) {
      const prevIndex = currentCityIndex - 1;
      setCurrentCityIndex(prevIndex);
      setSelectedCity(Object.keys(entriesByCity)[prevIndex]);
      flatListRef.current?.scrollToOffset({
        offset: prevIndex * windowWidth,
        animated: true
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
        <Text style={styles.loadingText}>Cargando diario de viaje...</Text>
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

  if (cities.length === 0) {
    return (
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { marginTop: insets.top + 24 }
          ]}
        >
          Diario de Viaje
        </Text>
        <EmptyState message="Aún no tienes entradas en tu diario. Completa misiones para añadir fotos a tu diario de viaje." />
      </View>
    );
  }

  const renderCityCard = ({ item }: { item: string }) => (
    <View style={[styles.cityCardContainer, { width: windowWidth }]}>
      <View style={styles.cityCardContent}>
        <CityCard
          city={item}
          entries={entriesByCity[item]}
          onPress={() => {
            const index = cities.indexOf(item);
            setSelectedCity(item);
            setCurrentCityIndex(index);
            flatListRef.current?.scrollToOffset({
              offset: index * windowWidth,
              animated: true
            });
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { marginTop: insets.top + 20 }
        ]}
      >
        Diario de Viaje
      </Text>
      <View style={styles.cityCarouselContainer}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonLeft]}
          onPress={handlePrevCity}
          disabled={currentCityIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={30}
            color={currentCityIndex === 0 ? '#ccc' : '#005F9E'}
          />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          horizontal
          data={cities}
          renderItem={renderCityCard}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToInterval={windowWidth}
          decelerationRate="fast"
          snapToAlignment="center"
          onMomentumScrollEnd={(event) => {
            const offset = event.nativeEvent.contentOffset.x;
            const index = Math.round(offset / windowWidth);
            setCurrentCityIndex(index);
            setSelectedCity(cities[index]);
          }}
        />

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonRight]}
          onPress={handleNextCity}
          disabled={currentCityIndex === cities.length - 1}
        >
          <Ionicons
            name="chevron-forward"
            size={30}
            color={currentCityIndex === cities.length - 1 ? '#ccc' : '#005F9E'}
          />
        </TouchableOpacity>
      </View>

      {selectedCity ? (
        entriesByCity[selectedCity].length > 0 ? (
          <FlatList
            data={entriesByCity[selectedCity]}
            renderItem={({ item }) => <JournalEntryCard entry={item} />}
            keyExtractor={(item) => item.id}
            style={styles.entriesList}
          />
        ) : (
          <EmptyState message={`No hay entradas de diario para ${selectedCity}`} />
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    marginHorizontal: 15,
    color: '#F5D90A',
    letterSpacing: 1,
  },
  cityCarouselContainer: {
    height: 220,
    position: 'relative',
    marginBottom: 15,
  },
  cityCardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityCardContent: {
    width: Dimensions.get('window').width - 60,
    paddingHorizontal: 0,
  },
  cityCard: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#232634',
  },
  entriesList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#232634',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    marginHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#F5D90A',
    letterSpacing: 1,
  },
  cardDate: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 10,
  },
  cardContent: {
    color: '#FFF',
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
    backgroundColor: '#7F5AF0',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#2CB67D',
    marginRight: 10,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
  },
  loadingText: {
    marginTop: 10,
    color: '#F5D90A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#181A20',
  },
  errorText: {
    color: '#F5D90A',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#7F5AF0',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#A1A1AA',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  carouselContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 15,
  },
  imageContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  cityCardBackground: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cityCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cityName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  viewMissionsText: {
    color: '#F5D90A',
    marginTop: 8,
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    zIndex: 1,
    backgroundColor: '#232634',
    borderRadius: 25,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  navButtonLeft: {
    left: 15,
  },
  navButtonRight: {
    right: 15,
  },
});

export default JournalScreen; 