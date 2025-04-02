// MissionsScreen.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { completeMission } from '../../services/pointsService';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ProgressBar, useTheme, Surface } from 'react-native-paper';
import { completeMission as dispatchCompleteMission } from '../../features/journey/journeySlice';
import ImageUploadModal from '../../components/ImageUploadModal';
import { setRefreshJournal } from '../../features/journalSlice';
import { createJournalEntry } from '../../services/journalService';

type MissionsScreenRouteProp = RouteProp<{
  Missions: {
    journeyId: string;
    challenges: JourneyMission[];
  };
}, 'Missions'>;

interface MissionsScreenProps {
  route: MissionsScreenRouteProp;
  navigation: any;
}

interface CityMissions {
  [cityName: string]: {
    completed: JourneyMission[];
    pending: JourneyMission[];
    expired: JourneyMission[];
  };
}

interface JourneyMission {
  id: string;
  completed: boolean;
  cityName: string;
  end_date: string;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
  };
}

interface Journey {
  id: string;
  description: string;
  created_at: string;
  cities?: {
    name: string;
  };
  journeys_missions: {
    id: string;
    completed: boolean;
    challengeId: string;
    end_date: string;
    challenges: {
      id: string;
      title: string;
      description: string;
      difficulty: string;
      points: number;
    };
  }[];
}

interface Friend {
  user2Id: string;
  username: string;
  points: number;
}

const getTimeRemaining = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) {
    return {
      isExpired: true,
      text: 'Tiempo expirado'
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      isExpired: false,
      text: `${days} días restantes`
    };
  } else if (hours > 0) {
    return {
      isExpired: false,
      text: `${hours} horas restantes`
    };
  } else {
    return {
      isExpired: false,
      text: `${minutes} minutos restantes`
    };
  }
};

// Modificamos MissionCard para incluir el botón de compartir
const MissionCard = ({ mission, onComplete, onShare }: { 
  mission: JourneyMission; 
  onComplete: (imageUrl?: string) => void;
  onShare: () => void;
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const timeRemaining = getTimeRemaining(mission.end_date);
  const isExpired = timeRemaining.isExpired && !mission.completed;
  const [completingMission, setCompletingMission] = useState(false);

  const handleMissionPress = () => {
    if (!mission.completed && !isExpired) {
      setShowUploadModal(true);
    }
  };

  const handleUploadSuccess = (imageUrl: string) => {
    setShowUploadModal(false);
    onComplete(imageUrl);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          mission.completed && styles.completedCard,
          isExpired && styles.expiredCard
        ]}
        onPress={handleMissionPress}
        disabled={mission.completed || isExpired || completingMission}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
          <View style={styles.badgeContainer}>
            <Text style={[
              styles.badge,
              { backgroundColor: mission.completed ? '#4CAF50' : isExpired ? '#f44336' : '#FFA000' }
            ]}>
              {mission.completed ? 'Completada' : isExpired ? 'Expirada' : 'Pendiente'}
            </Text>
            <Text style={[
              styles.timeRemaining,
              isExpired && styles.expiredTime
            ]}>
              {timeRemaining.text}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>{mission.challenge.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.difficulty}>Dificultad: {mission.challenge.difficulty}</Text>
          <Text style={styles.points}>{mission.challenge.points} puntos</Text>
          {/* Botón para compartir: solo si la misión no está completada y no expiró */}
          {(!mission.completed && !timeRemaining.isExpired) && (
            <TouchableOpacity onPress={onShare} style={styles.shareIcon}>
              <Ionicons name="share-social" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>

        {completingMission && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Completando misión...</Text>
          </View>
        )}
      </TouchableOpacity>

      <ImageUploadModal
        visible={showUploadModal}
        missionId={mission.id}
        missionTitle={mission.challenge.title}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
};

const CityCard = ({ cityName, totalMissions, completedMissions, expiredMissions, onPress }: { 
  cityName: string; 
  totalMissions: number;
  completedMissions: number;
  expiredMissions?: number;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.cityCard} onPress={onPress}>
    <View style={styles.cityCardContent}>
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{cityName}</Text>
        <Text style={styles.missionCount}>
          {completedMissions}/{totalMissions} misiones completadas
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </View>
    <View style={styles.progressBar}>
      <View 
        style={[
          styles.progressFill, 
          { width: `${(completedMissions / totalMissions) * 100}%` }
        ]} 
      />
    </View>
  </TouchableOpacity>
);

// Modal para seleccionar un amigo (se usa igual que antes)
const FriendSelectionModal = ({ visible, onClose, onSelect }: { 
  visible: boolean; 
  onClose: () => void; 
  onSelect: (friend: Friend) => void;
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (visible) {
      const fetchFriends = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const { data: friendData, error } = await supabase
            .from('friends')
            .select('user2Id')
            .eq('user1Id', user.id);
          if (error) throw error;
  
          const friendDetails = await Promise.all(
            friendData.map(async (friend: { user2Id: string }) => {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, points')
                .eq('id', friend.user2Id)
                .single();
              if (userError) return null;
              return {
                user2Id: friend.user2Id,
                username: userData.username,
                points: userData.points,
              };
            })
          );
  
          setFriends(friendDetails.filter((f) => f !== null) as Friend[]);
        } catch (error) {
          console.error('Error fetching friends:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
    }
  }, [visible, user]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <Text style={modalStyles.modalTitle}>Selecciona un amigo</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.user2Id}
              renderItem={({ item }) => (
                <TouchableOpacity style={modalStyles.friendItem} onPress={() => onSelect(item)}>
                  <Text style={modalStyles.friendName}>{item.username}</Text>
                  <Text style={modalStyles.friendPoints}>Puntos: {item.points}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex:1,
    backgroundColor:'rgba(0,0,0,0.5)',
    justifyContent:'center',
    alignItems:'center'
  },
  modalContent: {
    width:'80%',
    backgroundColor:'white',
    borderRadius:10,
    padding:20,
    maxHeight:'80%'
  },
  modalTitle: {
    fontSize:20,
    fontWeight:'bold',
    marginBottom:10
  },
  friendItem: {
    padding:10,
    borderBottomWidth:1,
    borderBottomColor:'#ccc'
  },
  friendName: {
    fontSize:16
  },
  friendPoints: {
    fontSize:14,
    color:'#666'
  },
  cancelButton: {
    marginTop:10,
    backgroundColor:'#f44336',
    padding:10,
    borderRadius:5,
    alignItems:'center'
  },
  cancelButtonText: {
    color:'white',
    fontWeight:'bold'
  }
});

const MissionsScreen = ({ route, navigation }: MissionsScreenProps) => {
  const { journeyId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [missions, setMissions] = useState<CityMissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  // Estado para mostrar modal de compartir
  const [showShareModal, setShowShareModal] = useState(false);
  const dispatch = useDispatch();
  const theme = useTheme();

  const fetchMissions = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          description,
          created_at,
          cities (
            name
          ),
          journeys_missions!inner (
            id,
            completed,
            challengeId,
            end_date,
            challenges!inner (
              id,
              title,
              description,
              difficulty,
              points
            )
          )
        `)
        .eq('userId', user.id)
        .order('created_at', { ascending: false });

      if (journeysError) throw journeysError;

      if (!journeys || journeys.length === 0) {
        setError('No hay viajes disponibles');
        setLoading(false);
        return;
      }

      const allMissions = journeys.flatMap((journey: Journey) => 
        journey.journeys_missions.map((jm) => ({
          id: jm.id,
          completed: jm.completed,
          cityName: journey.cities?.name || 'Ciudad Desconocida',
          end_date: jm.end_date,
          challenge: {
            title: jm.challenges.title,
            description: jm.challenges.description,
            difficulty: jm.challenges.difficulty,
            points: jm.challenges.points
          }
        }))
      );

      // Organizar misiones por ciudad
      const missionsByCity: CityMissions = {};
      allMissions.forEach((mission: JourneyMission) => {
        if (!missionsByCity[mission.cityName]) {
          missionsByCity[mission.cityName] = {
            completed: [],
            pending: [],
            expired: []
          };
        }
        if (mission.completed) {
          missionsByCity[mission.cityName].completed.push(mission);
        } else {
          missionsByCity[mission.cityName].pending.push(mission);
        }
      });

      setMissions(missionsByCity);
    } catch (error) {
      console.error('Error fetching missions:', error);
      setError('Error al cargar las misiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [journeyId]);

  const handleCompleteMission = async (missionId: string, imageUrl?: string) => {
    try {
      setCompletingMission(true);

      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      await createJournalEntry({
        userId: user.id,
        missionId: missionId,
        photos: [imageUrl || ''],
        title: 'Misión completada',
        content: 'Misión completada con éxito',
        cityId: selectedCity || 'Ciudad Desconocida'
      });

      const points = await completeMission(missionId, user.id, imageUrl);

      // Actualizar la lista de misiones localmente
      const updatedMissions = { ...missions };
      let missionFound = false;

      for (const city in updatedMissions) {
        if (updatedMissions[city].pending) {
          const pendingIndex = updatedMissions[city].pending.findIndex(m => m.id === missionId);
          if (pendingIndex !== -1) {
            const mission = { ...updatedMissions[city].pending[pendingIndex], completed: true };
            updatedMissions[city].pending.splice(pendingIndex, 1);
            updatedMissions[city].completed.push(mission);
            missionFound = true;
            break;
          }
        }
        if (!missionFound && updatedMissions[city].expired) {
          const expiredIndex = updatedMissions[city].expired.findIndex(m => m.id === missionId);
          if (expiredIndex !== -1) {
            const mission = { ...updatedMissions[city].expired[expiredIndex], completed: true };
            updatedMissions[city].expired.splice(expiredIndex, 1);
            updatedMissions[city].completed.push(mission);
            missionFound = true;
            break;
          }
        }
      }

      if (!missionFound) {
        console.warn('No se encontró la misión con ID:', missionId);
      }

      setMissions(updatedMissions);
      dispatch(dispatchCompleteMission(missionId));

      Alert.alert(
        'Misión Completada',
        `¡Felicidades! Has completado la misión y has ganado ${points} puntos.\n\n¿Quieres ver tu entrada en el diario de viaje?`,
        [
          {
            text: 'Ver Diario',
            onPress: () => {
              dispatch(setRefreshJournal(true));
              navigation.navigate('Journal', { refresh: true });
            }
          },
          {
            text: 'Continuar',
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('Error completando misión:', error);
      Alert.alert('Error', 'No se pudo completar la misión');
    } finally {
      setCompletingMission(false);
    }
  };

  // Función para compartir el journey (desde una misión)
  const handleShareJourney = async (friend: Friend) => {
    try {
      const { error } = await supabase
        .from('journeys_shared')
        .insert({
          journeyId: journeyId,
          ownerId: user.id,
          sharedWithUserId: friend.user2Id
        });
      if (error) throw error;
      Alert.alert('Éxito', `Journey compartido con ${friend.username}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo compartir el journey');
    } finally {
      setShowShareModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando misiones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMissions}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedCity) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus Ciudades</Text>
          <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
        </View>
        <ScrollView style={styles.citiesList}>
          {Object.entries(missions).map(([cityName, missions]) => (
            <CityCard
              key={cityName}
              cityName={cityName}
              totalMissions={missions.completed.length + missions.pending.length}
              completedMissions={missions.completed.length}
              expiredMissions={missions.expired.length}
              onPress={() => setSelectedCity(cityName)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const cityData = missions[selectedCity];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setSelectedCity(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Ciudades</Text>
        </TouchableOpacity>
        <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
      </View>
      
      <Text style={styles.cityTitle}>{selectedCity}</Text>
      
      <ScrollView style={styles.missionsList}>
        {cityData.pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Misiones Pendientes</Text>
            {cityData.pending.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={(imageUrl) => handleCompleteMission(mission.id, imageUrl)}
                onShare={() => setShowShareModal(true)}
              />
            ))}
          </>
        )}

        {cityData.expired.length > 0 && (
          <>
            <View style={styles.completedDivider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.completedText, { color: '#f44336' }]}>Expiradas</Text>
              <View style={styles.dividerLine} />
            </View>
            {cityData.expired.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={() => {}}
                onShare={() => {}}
              />
            ))}
          </>
        )}

        {cityData.completed.length > 0 && (
          <>
            <View style={styles.completedDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.completedText}>Completadas</Text>
              <View style={styles.dividerLine} />
            </View>
            {cityData.completed.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={() => {}}
                onShare={() => {}}
              />
            ))}
          </>
        )}
      </ScrollView>
      <FriendSelectionModal 
        visible={showShareModal} 
        onClose={() => setShowShareModal(false)}
        onSelect={handleShareJourney}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 10
  },
  citiesList: {
    flex: 1,
  },
  cityCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cityCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  missionCount: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  missionsList: {
    flex: 1,
  },
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
  },
  completedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4CAF50',
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completedCard: {
    opacity: 0.8,
  },
  expiredCard: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  cardDescription: {
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficulty: {
    color: '#666',
    fontSize: 12,
  },
  points: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  shareIcon: {
    marginLeft: 10,
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
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default MissionsScreen;
