import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, Platform, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfilePictureUrl } from '../../services/profileService';
import { CLOUDINARY_CONFIG } from '../../config/cloudinary';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';

interface JourneyMission {
  id: string;
  title: string;
  points: number;
  entries: {
    id: string;
    title: string;
    content: string;
    photos: string[];
    created_at: string;
  }[];
  completed: boolean;
  challenges: {
    points: number;
  };
}

interface Journey {
  id: string;
  cityId: string;
  cityName: string;
  description: string;
  photos: string[];
  points: number;
  completed_at: string;
  completedMissions: JourneyMission[];
  journeys_missions: JourneyMission[];
}

interface FriendProfileScreenProps {
  route: {
    params: {
      friendId: string;
      friendName: string;
    };
  };
}

const { width } = Dimensions.get('window');
const JOURNEY_IMAGE_WIDTH = width - 40; // 20 de padding en cada lado

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

const FriendProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { friendId, friendName } = route.params as { friendId: string; friendName: string };
  const [loading, setLoading] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    visitedCities: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(50);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [entriesByCity, setEntriesByCity] = useState<{ [cityName: string]: CityJournalEntry[] }>({});

  useEffect(() => {
    fetchFriendData();
  }, [friendId]);

  const fetchFriendData = async () => {
    if (!friendId) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener los puntos, nivel y XP del amigo
      const { data: friendData, error: friendError } = await supabase
        .from('users')
        .select('points, level, xp, xp_next, username, profile_pic_url')
        .eq('id', friendId)
        .single();

      if (friendError) throw friendError;

      // Obtener los journeys del amigo con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          cityId,
          journeys_missions!inner (
            completed,
            challenges!inner (
              points
            )
          )
        `)
        .eq('userId', friendId);

      if (journeysError) throw journeysError;

      // Calcular estadísticas
      const stats = {
        totalPoints: friendData?.points || 0,
        completedMissions: 0,
        visitedCities: 0
      };

      (journeys as Journey[])?.forEach((journey: Journey) => {
        // Añadir la ciudad a las visitadas
        if (journey.cityId) {
          stats.visitedCities++;
        }

        // Contar misiones completadas
        journey.journeys_missions.forEach((mission: JourneyMission) => {
          if (mission.completed) {
            stats.completedMissions++;
          }
        });
      });

      setStats(stats);
      setLevel(friendData?.level || 1);
      setXp(friendData?.xp || 0);
      setXpNext(friendData?.xp_next || 50);
      setProfilePicUrl(friendData?.profile_pic_url || null);

      // Obtener las entradas del diario del amigo
      const entries = await getUserJournalEntries(friendId);
      setEntriesByCity(entries);

      // Seleccionar la primera ciudad por defecto
      const cities = Object.keys(entries);
      if (cities.length > 0 && !selectedCity) {
        setSelectedCity(cities[0]);
      }

    } catch (error) {
      console.error('Error al cargar datos del amigo:', error);
      setError('No se pudieron cargar los datos del perfil. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.headerBackground}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#005F9E" />
            </TouchableOpacity>
            <Text style={styles.title}>Perfil de {friendName}</Text>
          </View>
        </View>

        <View style={styles.profileSection}>
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{friendName.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.username}>{friendName}</Text>
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Nivel {level}</Text>
            <View style={styles.xpBar}>
              <View 
                style={[
                  styles.xpProgress, 
                  { width: `${(xp / xpNext) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.xpText}>{xp}/{xpNext} XP</Text>
          </View>
          <Text style={styles.points}>Puntos: {stats.totalPoints}</Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedMissions}</Text>
            <Text style={styles.statLabel}>Misiones Completadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.visitedCities}</Text>
            <Text style={styles.statLabel}>Ciudades Visitadas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos Viajes</Text>
          {Object.values(entriesByCity).length === 0 ? (
            <Text style={styles.emptyText}>No hay viajes completados</Text>
          ) : (
            Object.values(entriesByCity).map((cityEntries, index) => (
              <View key={index} style={styles.journeyItem}>
                <View style={styles.journeyImagesContainer}>
                  {cityEntries.length > 0 && cityEntries[0].photos && cityEntries[0].photos.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.photosScrollView}
                    >
                      {cityEntries.map((entry, entryIndex) => (
                        <Image 
                          key={`${index}-${entryIndex}`}
                          source={{ uri: entry.photos[0] }} 
                          style={styles.journeyImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={[styles.journeyImage, styles.noImageContainer]}>
                      <Ionicons name="image-outline" size={40} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.journeyContent}>
                  <Text style={styles.journeyCity}>{selectedCity || 'Ciudad Desconocida'}</Text>
                  <Text style={styles.journeyDescription} numberOfLines={2}>
                    {cityEntries.length > 0 ? cityEntries[0].content : 'Sin descripción'}
                  </Text>
                  <View style={styles.journeyFooter}>
                    <Text style={styles.journeyDate}>
                      {cityEntries.length > 0 ? new Date(cityEntries[0].created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Fecha desconocida'}
                    </Text>
                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsText}>{cityEntries.length > 0 ? cityEntries[0].points || 0 : '0'}</Text>
                      <Text style={styles.pointsLabel}>puntos</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    backgroundColor: '#005F9E',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  xpBar: {
    height: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    flex: 1,
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#005F9E',
    borderRadius: 5,
  },
  xpText: {
    fontSize: 14,
    color: '#666',
  },
  points: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  journeyItem: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  journeyImagesContainer: {
    height: 200,
    width: '100%',
  },
  photosScrollView: {
    flex: 1,
  },
  journeyImage: {
    width: JOURNEY_IMAGE_WIDTH,
    height: 200,
    marginRight: 10,
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  journeyContent: {
    padding: 15,
  },
  journeyCity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  journeyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  journeyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyDate: {
    fontSize: 12,
    color: '#999',
  },
  pointsContainer: {
    backgroundColor: '#005F9E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  pointsLabel: {
    color: 'white',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  journalCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  journalCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  journalCardDate: {
    fontSize: 12,
    color: '#999',
  },
  journalMissionBadge: {
    backgroundColor: '#4CAF50',
    padding: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  journalMissionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  journalCardContent: {
    fontSize: 14,
    color: '#666',
  },
  journalPhotoGrid: {
    flexDirection: 'row',
    marginTop: 5,
  },
  journalThumbnail: {
    width: 100,
    height: 100,
    marginRight: 5,
    borderRadius: 5,
  },
  journalMorePhotos: {
    backgroundColor: '#f5f5f5',
    padding: 5,
    borderRadius: 5,
  },
  journalMorePhotosText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  journalTags: {
    flexDirection: 'row',
    marginTop: 5,
  },
  journalTag: {
    backgroundColor: '#f5f5f5',
    padding: 2,
    borderRadius: 5,
    marginRight: 5,
  },
  journalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalEmptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});

export default FriendProfileScreen; 