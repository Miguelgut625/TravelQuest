import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
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

const JournalScreen = ({ route }: JournalScreenProps) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [entriesByCity, setEntriesByCity] = useState<{ [cityName: string]: CityJournalEntry[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005F9E" />
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
        <Text style={styles.title}>Diario de Viaje</Text>
        <EmptyState message="Aún no tienes entradas en tu diario. Completa misiones para añadir fotos a tu diario de viaje." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diario de Viaje</Text>
      <View style={styles.cityTabs}>
        <FlatList
          horizontal
          data={cities}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cityTab, selectedCity === item && styles.selectedCityTab]}
              onPress={() => setSelectedCity(item)}
            >
              <Text style={[styles.cityTabText, selectedCity === item && styles.selectedCityTabText]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
        />
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
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#005F9E',
  },
  cityTabs: {
    marginBottom: 10,
  },
  cityTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  selectedCityTab: {
    backgroundColor: '#005F9E',
  },
  cityTabText: {
    color: '#666',
  },
  selectedCityTabText: {
    color: 'white',
    fontWeight: 'bold',
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
    color: '#005F9E',
    marginRight: 10,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
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
});

export default JournalScreen; 