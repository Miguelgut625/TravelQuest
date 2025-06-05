// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Animated, Dimensions, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';
import { Ionicons } from '@expo/vector-icons';
import { setRefreshJournal } from '../../features/journalSlice';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, commonStyles, carouselStyles, typography, spacing, shadows, borderRadius } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

interface JournalScreenProps {
  route: RouteProp<TabParamList, 'Journal'>;
}

const JournalEntryCard = ({ entry, styles }: { entry: CityJournalEntry, styles: any }) => {
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { colors, isDarkMode } = useTheme();

  const handlePress = () => {
    setExpanded(!expanded);
  };

  const handleLongPress = () => {
    navigation.navigate('JournalEntryDetail', { entry });
  };

  const openDetailView = () => {
    navigation.navigate('JournalEntryDetail', { entry });
  };

  // Determinar si la descripción es detallada (generada por IA)
  const isDetailedDescription = entry.content && entry.content.length > 150;
  const isAIGenerated = entry.content && (
    entry.content.includes("nombre científico") ||
    entry.content.includes("año de construcción") ||
    entry.content.includes("estilo arquitectónico") ||
    entry.content.includes("CURIOSIDADES") ||
    entry.content.includes("curiosidades") ||
    entry.content.includes("Hoy he visitado")
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear la fecha:', error);
      return 'Fecha no disponible';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isAIGenerated && styles.aiGeneratedCard]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={openDetailView}
        >
          <Ionicons name="expand-outline" size={20} color={isDarkMode ? colors.accent : colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDate}>{formatDate(entry.created_at)}</Text>
      <Text style={styles.cardAuthor}>{user?.username || 'Usuario'}</Text>

      {isAIGenerated && (
        <View style={styles.aiGeneratedBadge}>
          <Ionicons name="sparkles" size={14} color="#FFF" />
          <Text style={styles.aiGeneratedText}>Descripción detallada</Text>
        </View>
      )}

      {isDetailedDescription ? (
        <>
          <Text style={[styles.cardContent, isAIGenerated && styles.aiGeneratedContent]} numberOfLines={expanded ? undefined : 3}>
            {entry.content}
          </Text>
          {!expanded && (
            <Text style={styles.expandText}>
              Toca para ver más... o presiona el botón para ver en pantalla completa
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.cardContent}>
          {entry.content}
        </Text>
      )}

      {expanded && isDetailedDescription && (
        <View style={styles.actionRow}>
          <Text style={styles.collapseText}>Toca para colapsar</Text>
          <TouchableOpacity
            onPress={openDetailView}
            style={styles.viewDetailButton}
          >
            <Text style={styles.viewDetailText}>Ver detalle</Text>
          </TouchableOpacity>
        </View>
      )}

      {entry.photos && entry.photos.length > 0 && (
        <View style={styles.photoGrid}>
          {entry.photos.slice(0, 3).map((photo, index) => (
            <TouchableOpacity key={index} onPress={openDetailView}>
              <Image
                source={{ uri: photo }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
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
};

const EmptyState = ({ message, styles }: { message: string, styles: any }) => (
  <View style={styles.emptyContainer}>
    {/* @ts-ignore */}
    <Ionicons name="journal-outline" size={64} color={styles.emptyText?.color || '#ccc'} />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const CityCard = ({ city, entries, onPress, styles }: { city: string; entries: CityJournalEntry[]; onPress: () => void, styles: any }) => {
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
        <Text style={{
          color: '#FFF',
          fontWeight: 'bold',
          fontSize: 16,
          marginTop: 8,
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 8,
          overflow: 'hidden',
          alignSelf: 'center',
        }}>
          Ver misiones ({entries.length})
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const JournalScreen = ({ route }: JournalScreenProps) => {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
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
  const HEADER_HEIGHT = 64 + (insets?.top || 0);

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
      <SafeAreaView style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Diario de Viaje</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={40} color={colors.primary} />
          <Text style={styles.loadingText}>Cargando diario de viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Diario de Viaje</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchJournalEntries}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cities = Object.keys(entriesByCity);

  if (cities.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diario de Viaje</Text>
          </View>
        </SafeAreaView>
        <EmptyState message="Aún no tienes entradas en tu diario. Completa misiones para añadir fotos a tu diario de viaje." styles={styles} />
      </SafeAreaView>
    );
  }

  // --- NUEVA ESTRUCTURA ---
  // Imagen de ciudad y carousel (usando la ciudad seleccionada)
  const selectedCityName = cities[currentCityIndex] || cities[0];
  const selectedCityEntries = entriesByCity[selectedCityName] || [];
  const firstPhoto = selectedCityEntries.find(e => e.photos && e.photos.length > 0)?.photos[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header fijo y separado */}
      <View style={styles.headerSafeArea}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Diario de Viaje</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Imagen de ciudad y overlay */}
      <View style={styles.cityImageContainer}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.cityImage} resizeMode="cover" />
        ) : (
          <View style={styles.cityImagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={styles.emptyText?.color || '#ccc'} />
          </View>
        )}
        {/* Overlay de controles y texto */}
        <View style={styles.cityOverlay}>
          <Ionicons name="location" size={32} color={styles.cityName?.color || '#fff'} />
          <Text style={styles.cityName}>{selectedCityName}</Text>
          <Text style={styles.cityMissionsButton}>
            Ver misiones ({selectedCityEntries.length})
          </Text>
        </View>
        {/* Flechas carousel (opcional, si tienes varias ciudades) */}
        {cities.length > 1 && (
          <>
            <TouchableOpacity style={styles.carouselLeft} onPress={handlePrevCity} disabled={currentCityIndex === 0}>
              <Ionicons name="chevron-back" size={32} color={styles.cityName?.color || '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.carouselRight} onPress={handleNextCity} disabled={currentCityIndex === cities.length - 1}>
              <Ionicons name="chevron-forward" size={32} color={styles.cityName?.color || '#fff'} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Scroll principal */}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Contenido principal */}
        <View style={styles.contentContainer}>
          {selectedCityEntries.length > 0 ? (
            selectedCityEntries.map(entry => (
              <JournalEntryCard key={entry.id} entry={entry} styles={styles} />
            ))
          ) : (
            <EmptyState message={`No hay entradas de diario para ${selectedCityName}`} styles={styles} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : colors.surface,
  },
  headerSafeArea: {
    backgroundColor: isDarkMode ? colors.background : colors.primary,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: isDarkMode ? colors.accent : colors.surface,
    letterSpacing: 1,
  },
  backButton: {
    backgroundColor: isDarkMode ? colors.accent : colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cityImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    marginBottom: 12,
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  cityImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  cityImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  cityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingTop: 24,
  },
  cityName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDarkMode ? colors.accent : colors.surface,
    textAlign: 'center',
    textShadowColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 8,
  },
  cityMissionsButton: {
    color: isDarkMode ? colors.accent : colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(43,108,176,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  carouselLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4,
    zIndex: 3,
  },
  carouselRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4,
    zIndex: 3,
  },
  contentContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  cityCardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityCardContent: {
    paddingHorizontal: 0,
  },
  cityCard: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  entriesList: {
    flex: 1,
  },
  entriesListContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.accent : colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    flex: 1,
    color: isDarkMode ? colors.accent : colors.primary,
    letterSpacing: 1,
  },
  detailButton: {
    padding: spacing.xs,
  },
  cardDate: {
    color: isDarkMode ? colors.accent : colors.primary,
    ...typography.small,
    marginBottom: spacing.sm,
  },
  cardAuthor: {
    color: isDarkMode ? colors.accent : colors.primary,
    ...typography.small,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  cardContent: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  expandText: {
    color: isDarkMode ? colors.accent : colors.primary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    ...typography.small,
  },
  collapseText: {
    color: isDarkMode ? colors.accent : colors.primary,
    fontStyle: 'italic',
    ...typography.small,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewDetailButton: {
    backgroundColor: isDarkMode ? colors.accent : colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
  },
  viewDetailText: {
    color: isDarkMode ? colors.background : colors.surface,
    ...typography.small,
    fontWeight: 'bold',
  },
  photoGrid: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.small,
    marginRight: spacing.xs,
  },
  morePhotos: {
    width: 80,
    height: 80,
    backgroundColor: isDarkMode ? colors.accent : colors.primary,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: isDarkMode ? colors.background : colors.surface,
    ...typography.body,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: isDarkMode ? colors.accent : colors.primary,
    marginRight: spacing.sm,
    ...typography.small,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#005F9E',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#005F9E',
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
    color: '#666',
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
  headerRight: {
    width: 24,
    height: 24,
  },
  aiGeneratedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#7F5AF0',
  },
  aiGeneratedContent: {
    fontStyle: 'normal',
    color: colors.text.primary,
    lineHeight: 22,
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F5AF0',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  aiGeneratedText: {
    color: colors.white,
    ...typography.small,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});

export default JournalScreen; 