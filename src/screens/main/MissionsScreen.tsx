// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList, SafeAreaView, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { completeMission as dispatchCompleteMission } from '../../features/journey/journeySlice';
import { completeMission } from '../../services/pointsService';
import ImageUploadModal from '../../components/ImageUploadModal';
import { setRefreshJournal } from '../../features/journalSlice';
import { createJournalEntry } from '../../services/journalService';
import MissionCompletedModal from '../../components/MissionCompletedModal';
import CompletingMissionModal from '../../components/CompletingMissionModal';
import { addExperienceToUser } from '../../services/experienceService';
import { awardSpecificBadges } from '../../services/badgeService';
import { analyzeImage } from '../../services/aiService';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { getUserPoints } from '../../services/pointsService';
import { RouteProp } from '@react-navigation/native';
import { getOrCreateCity } from '../../services/missionGenerator';
import { shareJourney, getJourneySharedUsers, isJourneyShared } from '../../services/shareService';
import { getFriends } from '../../services/friendService';

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
  journeyId: string;
  end_date: string;
  isOwn?: boolean;
  isShared?: boolean;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
  };
}

interface Friend {
  user2Id: string;
  username: string;
  points: number;
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

interface City {
  cityName: string;
  journeyId: string;
  totalMissions: number;
  completedMissions: number;
  expiredMissions?: number;
  sharedUsers?: Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    status?: string;  // Estado de la invitación: 'accepted' o 'pending'
  }>;
  isShared?: boolean;
  hasAcceptedShares?: boolean;  // Si tiene compartidos que aceptaron
  hasPendingShares?: boolean;   // Si tiene compartidos pendientes
  ownerId?: string;             // Propietario del viaje
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

const MissionCard = ({ mission, onComplete, onShare }: {
  mission: JourneyMission;
  onComplete: (imageUrl?: string) => void;
  onShare: () => void;
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const timeRemaining = getTimeRemaining(mission.end_date);
  const isExpired = timeRemaining.isExpired && !mission.completed;

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
        disabled={mission.completed || isExpired}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
          <View style={styles.badgeContainer}>
            <Text style={[
              styles.badge,
              { backgroundColor: mission.completed ? '#005F9E' : isExpired ? '#D32F2F' : '#FFB74D' }
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
          {(!mission.completed && !timeRemaining.isExpired) && (
            <TouchableOpacity onPress={onShare} style={styles.shareIcon}>
              {/* @ts-ignore */}
              <Ionicons name="share-social" size={20} color="#005F9E" />
            </TouchableOpacity>
          )}
        </View>
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

const CityCard = ({ cityName, totalMissions, completedMissions, expiredMissions, sharedUsers, isShared, hasAcceptedShares, hasPendingShares, onPress }: {
  cityName: string;
  totalMissions: number;
  completedMissions: number;
  expiredMissions?: number;
  sharedUsers?: Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    status?: string;
  }>;
  isShared?: boolean;
  hasAcceptedShares?: boolean; 
  hasPendingShares?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.cityCard} onPress={onPress}>
    <View style={styles.cityCardContent}>
      <View style={styles.cityInfo}>
        <View style={styles.cityHeader}>
          <Text style={styles.cityName}>{cityName || 'Ciudad'}</Text>
          
          {/* Indicador de viaje compartido */}
          {isShared && (
            <View style={[
              styles.sharedIndicator,
              hasAcceptedShares ? styles.acceptedShareIndicator : hasPendingShares ? styles.pendingShareIndicator : {}
            ]}>
              <Ionicons 
                name={hasAcceptedShares ? "people" : "people-outline"} 
                size={16} 
                color={hasAcceptedShares ? "#005F9E" : "#FF9800"} 
              />
              <Text style={[
                styles.sharedText,
                { color: hasAcceptedShares ? "#005F9E" : "#FF9800" }
              ]}>
                {hasAcceptedShares 
                  ? "Compartido" 
                  : hasPendingShares ? "Pendiente" : "Compartido"}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.missionCount}>
          {completedMissions || 0}/{totalMissions || 0} misiones completadas
        </Text>
        
        {/* Avatares de usuarios con los que se comparte */}
        {isShared && sharedUsers && sharedUsers.length > 0 && (
          <View style={styles.avatarsContainer}>
            {sharedUsers.slice(0, 3).map((user, index) => (
              <View 
                key={user?.id || index} 
                style={[
                  styles.avatarWrapper,
                  { marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index },
                  user?.status === 'pending' && styles.pendingAvatarWrapper
                ]}
              >
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={[
                      styles.avatar,
                      user?.status === 'pending' && { opacity: 0.6 }
                    ]}
                  />
                ) : (
                  <View style={[
                    styles.defaultAvatar,
                    user?.status === 'pending' && styles.pendingDefaultAvatar
                  ]}>
                    <Text style={styles.avatarText}>
                      {user?.username ? user.username.substring(0, 1).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                
                {/* Indicador de estado pendiente */}
                {user?.status === 'pending' && (
                  <View style={styles.pendingIndicator}>
                    <Ionicons name="time-outline" size={12} color="#FF9800" />
                  </View>
                )}
              </View>
            ))}
            
            {/* Indicador de más usuarios */}
            {sharedUsers.length > 3 && (
              <View style={[styles.avatarWrapper, { marginLeft: -10, zIndex: 7 }]}>
                <View style={styles.moreUsersAvatar}>
                  <Text style={styles.moreUsersText}>+{sharedUsers.length - 3}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
      
      {/* @ts-ignore */}
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </View>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${(completedMissions / (totalMissions || 1)) * 100}%` }
        ]}
      />
    </View>
  </TouchableOpacity>
);

const FriendSelectionModal = ({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (friends: Friend[] | Friend) => void;
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      const fetchFriends = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const friendsList = await getFriends(user.id);
          setFriends(friendsList || []);
        } catch (error) {
          console.error('Error fetching friends:', error);
          setFriends([]);
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
      // Reiniciar selecciones y estado de compartir al abrir el modal
      setSelectedFriends([]);
      setIsSharing(false);
    }
  }, [visible, user]);

  const toggleFriendSelection = (friendId: string) => {
    if (isSharing) return; // No permitir cambios si está compartiendo
    
    setSelectedFriends(current => {
      if (current.includes(friendId)) {
        return current.filter(id => id !== friendId);
      } else {
        return [...current, friendId];
      }
    });
  };

  const selectAllFriends = () => {
    if (isSharing) return; // No permitir cambios si está compartiendo
    
    if (selectedFriends.length === friends.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedFriends([]);
    } else {
      // Seleccionar todos
      setSelectedFriends(friends.map(friend => friend.user2Id));
    }
  };

  const handleShareWithSelected = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Selección vacía', 'Por favor, selecciona al menos un amigo para compartir el viaje.');
      return;
    }

    // Prevenir múltiples envíos
    if (isSharing) return;
    
    setIsSharing(true);

    const selectedFriendsObjects = friends.filter(friend =>
      selectedFriends.includes(friend.user2Id)
    );

    try {
      await onSelect(selectedFriendsObjects);
    } catch (error) {
      console.error('Error al compartir viaje:', error);
      // Si hay un error, permitir que el usuario intente de nuevo
      setIsSharing(false);
      Alert.alert('Error', 'Ocurrió un error al compartir el viaje. Inténtalo de nuevo.');
    }
    // No reseteamos isSharing aquí porque onSelect cerrará el modal
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      onRequestClose={() => !isSharing && onClose()} 
      transparent
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <Text style={modalStyles.modalTitle}>Compartir Viaje</Text>
          <Text style={modalStyles.modalSubtitle}>Selecciona a los amigos con los que quieres compartir este viaje</Text>
          
          {!loading && friends.length > 0 && (
            <TouchableOpacity
              style={[
                modalStyles.selectAllButton,
                isSharing && modalStyles.disabledButton
              ]}
              onPress={selectAllFriends}
              disabled={isSharing}
            >
              <Text style={modalStyles.selectAllText}>
                {selectedFriends.length === friends.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </Text>
              <Ionicons
                name={selectedFriends.length === friends.length
                  ? "checkmark-circle"
                  : "checkmark-circle-outline"}
                size={20}
                color="#005F9E"
              />
            </TouchableOpacity>
          )}
          
          {loading ? (
            <ActivityIndicator size={40} color="#4CAF50" />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.user2Id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    modalStyles.friendItem,
                    selectedFriends.includes(item.user2Id) && modalStyles.friendItemSelected,
                    isSharing && modalStyles.disabledItem
                  ]} 
                  onPress={() => toggleFriendSelection(item.user2Id)}
                  disabled={isSharing}
                >
                  <View style={modalStyles.friendInfo}>
                    <Text style={modalStyles.friendName}>{item.username}</Text>
                    <Text style={modalStyles.friendPoints}>Puntos: {item.points}</Text>
                  </View>
                  <Ionicons
                    name={selectedFriends.includes(item.user2Id) 
                      ? "checkmark-circle" 
                      : "checkmark-circle-outline"}
                    size={24}
                    color={selectedFriends.includes(item.user2Id) ? "#4CAF50" : "#999"}
                  />
                </TouchableOpacity>
              )}
            />
          )}
          
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity 
              style={[
                modalStyles.cancelButton,
                isSharing && modalStyles.disabledButton
              ]} 
              onPress={onClose}
              disabled={isSharing}
            >
              <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                modalStyles.shareButton, 
                (selectedFriends.length === 0 || isSharing) && modalStyles.disabledButton
              ]} 
              onPress={handleShareWithSelected}
              disabled={selectedFriends.length === 0 || isSharing}
            >
              {isSharing ? (
                <View style={modalStyles.sharingButtonContent}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[modalStyles.shareButtonText, {marginLeft: 8}]}>Compartiendo...</Text>
                </View>
              ) : (
                <Text style={modalStyles.shareButtonText}>
                  {selectedFriends.length === 0 
                    ? "Selecciona amigos" 
                    : `Compartir (${selectedFriends.length})`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Overlay para bloquear interacciones mientras se comparte */}
          {isSharing && (
            <View style={modalStyles.sharingOverlay}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={modalStyles.sharingText}>Compartiendo viaje...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  selectAllButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10
  },
  selectAllText: {
    fontWeight: '500',
    color: '#005F9E'
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  friendItemSelected: {
    backgroundColor: '#e6f7ff'
  },
  friendInfo: {
    flex: 1
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500'
  },
  friendPoints: {
    fontSize: 14,
    color: '#666'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  shareButton: {
    flex: 1.5,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  disabledItem: {
    opacity: 0.6,
  },
  sharingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    zIndex: 10,
  },
  sharingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F9E',
  },
});

const MissionsScreenComponent = ({ route, navigation }: MissionsScreenProps) => {
  const { journeyId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [cityMissions, setCityMissions] = useState<CityMissions>({});
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [completedMissionInfo, setCompletedMissionInfo] = useState<{
    title: string;
    points: number;
    cityName: string;
    levelUp?: boolean;
    newLevel?: number;
    xpGained: number;
    remainingXP: number;
    xpNext: number;
    journalEntry?: {
      content: string;
      imageUrl: string;
    };
  } | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [missionToShare, setMissionToShare] = useState<JourneyMission | null>(null);
  const [citiesData, setCitiesData] = useState<City[]>([]);
  const dispatch = useDispatch();
  const theme = useTheme();

  // Cargar puntos del usuario al inicio
  useEffect(() => {
    if (user?.id) {
      getUserPoints(user.id).then(points => {
        setUserPoints(points);
      }).catch(console.error);
    }
  }, [user?.id]);

  const fetchMissions = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      // Obtener viajes propios
      const { data: ownJourneys, error: ownJourneysError } = await supabase
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

      if (ownJourneysError) throw ownJourneysError;

      // Obtener viajes compartidos
      const { data: sharedJourneys, error: sharedJourneysError } = await supabase
        .from('journeys_shared')
        .select(`
          journeyId,
          journeys!inner (
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
          )
        `)
        .eq('sharedWithUserId', user.id)
        .eq('status', 'accepted')
        .order('shared_at', { ascending: false });

      if (sharedJourneysError) throw sharedJourneysError;

      // Combinar viajes propios y compartidos
      const allJourneys = [
        ...(ownJourneys || []).map(journey => ({ ...journey, isOwn: true })),
        ...(sharedJourneys?.map(shared => ({ ...shared.journeys, isShared: true })) || [])
      ];

      if (allJourneys.length === 0) {
        setError('No hay viajes disponibles');
        setLoading(false);
        return;
      }

      const allMissions = allJourneys.flatMap((journey) =>
        journey.journeys_missions.map((jm) => ({
          id: jm.id,
          completed: jm.completed,
          cityName: journey.cities?.name || 'Ciudad Desconocida',
          journeyId: journey.id,
          end_date: jm.end_date,
          isOwn: journey.isOwn,
          isShared: journey.isShared,
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

      setCityMissions(missionsByCity);

      // Preparar datos de ciudades con información de usuarios compartidos
      const citiesWithSharing = await Promise.all(
        Object.entries(missionsByCity).map(async ([cityName, missions]) => {
          // Tomar el primer journeyId de cualquier misión de esta ciudad
          const allCityMissions = [...missions.completed, ...missions.pending];
          const firstMission = allCityMissions[0];
          
          if (!firstMission) {
            return {
              cityName,
              totalMissions: 0,
              completedMissions: 0,
              journeyId: '',
              isShared: false,
              hasAcceptedShares: false,
              hasPendingShares: false,
              sharedUsers: []
            };
          }
          
          const journeyId = firstMission.journeyId;
          
          // Obtener datos de compartidos, incluyendo pendientes
          let sharedUsers = [];
          try {
            sharedUsers = await getJourneySharedUsers(journeyId, true);
          } catch (error) {
            console.error(`Error al obtener usuarios compartidos para ${cityName}:`, error);
            // Si hay error, continuamos con un array vacío
          }
          
          // Determinar si hay compartidos aceptados o pendientes
          const hasAcceptedShares = sharedUsers.some(user => user.status === 'accepted');
          const hasPendingShares = sharedUsers.some(user => user.status === 'pending');
          
          // Si hay cualquier tipo de compartido, es un viaje compartido
          const isShared = sharedUsers.length > 0;
          
          return {
            cityName,
            journeyId,
            totalMissions: missions.completed.length + missions.pending.length,
            completedMissions: missions.completed.length,
            expiredMissions: missions.expired ? missions.expired.length : 0,
            isShared,
            hasAcceptedShares,
            hasPendingShares,
            sharedUsers,
            ownerId: user.id // Suponemos que si estamos viendo el viaje, somos dueños o fue compartido con nosotros
          };
        })
      );
      
      setCitiesData(citiesWithSharing);

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
    console.log('🎯 Iniciando completeMission para misión:', missionId);

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para completar misiones.');
      return;
    }

    if (completingMission) {
      console.log('⚠️ Ya hay una misión en proceso de completarse, ignorando solicitud');
      return;
    }

    try {
      setCompletingMission(true);

      // Buscar la misión en los datos locales
      let foundMissionTitle = '';
      let foundMissionPoints = 0;
      let foundCityName = '';
      let foundMission = null;

      Object.keys(cityMissions).forEach((cityName) => {
        const pending = cityMissions[cityName].pending;
        const mission = pending.find((m) => m.id === missionId);
        if (mission) {
          foundMission = mission;
          foundMissionTitle = mission.challenge.title;
          foundMissionPoints = mission.challenge.points;
          foundCityName = cityName;
        }
      });

      // Preparar información para mostrar en el modal
      setCompletedMissionInfo({
        title: foundMissionTitle,
        points: foundMissionPoints,
        cityName: foundCityName,
        xpGained: foundMissionPoints,
        remainingXP: 0,
        xpNext: 50,
        journalEntry: imageUrl ? {
          content: `He completado la misión "${foundMissionTitle}" en ${foundCityName}. ¡Conseguí ${foundMissionPoints} puntos!`,
          imageUrl
        } : undefined
      });

      // Actualizar estado en Redux para reflejar cambios inmediatamente en la UI
      dispatch(dispatchCompleteMission(missionId));
      dispatch(setRefreshJournal(true));

      // Iniciar el proceso en segundo plano
      Promise.resolve().then(async () => {
        try {
          // Completar la misión en la base de datos
          await completeMission(missionId, user?.id || '', imageUrl);
          console.log('✅ Misión completada en la base de datos');

          // Si hay imagen, crear entrada de diario y proceso posterior
          if (imageUrl) {
            try {
              // Intentar obtener el cityId
              let cityId;
              try {
                cityId = foundMission?.cityId || await getOrCreateCity(foundCityName, user?.id);
                console.log('🌍 CityId obtenido:', cityId);
              } catch (cityError) {
                console.error('❌ Error al obtener/crear cityId:', cityError);
                cityId = 'unknown';
              }

              // Activar indicador de generación de descripción
              setGeneratingDescription(true);

              // Crear entrada de diario inicial
              console.log('📝 Creando entrada de diario inicial...');
              const journalEntry = await createJournalEntry({
                userId: user?.id || '',
                cityId: cityId,
                missionId: missionId,
                title: `Misión completada: ${foundMissionTitle}`,
                content: `He completado la misión "${foundMissionTitle}" en ${foundCityName}. ¡Conseguí ${foundMissionPoints} puntos!`,
                photos: [imageUrl],
                tags: [foundCityName || '', 'Misión completada']
              });

              console.log('📔 Entrada de diario creada:', journalEntry);

              // Generar descripción con IA
              console.log('🤖 Iniciando generación de descripción con IA...');

              const customPrompt = `Analiza la imagen adjunta tomada durante mi misión "${foundMissionTitle}" en ${foundCityName}.
              
              CONTEXTO: La misión consistía en ${foundMission?.challenge?.description || foundMissionTitle}
              
              Escribe una entrada de diario detallada como si fueses un guía turístico o historiador explicando lo que se ve en la imagen (máximo 300 palabras) que DEBE incluir:
              
              1. IDENTIFICACIÓN PRECISA DEL CONTENIDO DE LA IMAGEN:
                 - Si es un monumento: su nombre exacto, estilo arquitectónico, año de construcción y arquitecto
                 - Si es una planta o animal: su nombre científico, especie, características distintivas y hábitat
                 - Si es una obra de arte: su nombre completo, autor, año de creación y estilo artístico
                 - Si es un lugar: su nombre oficial, función histórica y actual, e importancia cultural
              
              2. INFORMACIÓN HISTÓRICA DETALLADA:
                 - Año exacto de construcción/creación/fundación del elemento principal
                 - Contexto histórico en el que surgió (época, movimiento cultural, etc.)
                 - Origen histórico o etimológico del nombre
                 - Evolución histórica o transformaciones importantes que ha sufrido
              
              3. TRES CURIOSIDADES INTERESANTES que la mayoría de turistas no conocen sobre el elemento principal que aparece en la imagen
              
              4. DATOS TÉCNICOS RELEVANTES:
                 - Para monumentos: materiales, dimensiones, técnicas constructivas
                 - Para especies: clasificación taxonómica, características biológicas únicas
                 - Para obras de arte: técnica utilizada, materiales, dimensiones
              
              5. Una breve REFLEXIÓN PERSONAL como si yo hubiera tomado la foto durante mi visita, mencionando la experiencia sensorial (olores, sonidos, sensaciones)
              
              ESTILO: Informativo pero accesible, combinando datos históricos precisos con un tono personal de diario de viaje.
              FORMATO: Párrafos cortos y claros, en primera persona, con datos específicos integrados naturalmente en la narración.`;

              try {
                const aiDescription = await analyzeImage(imageUrl, foundCityName, 'tourist', customPrompt);

                if (aiDescription && aiDescription.length > 20) {
                  const { error: updateError } = await supabase
                    .from('journal_entries')
                    .update({ content: aiDescription })
                    .eq('missionid', missionId)
                    .eq('userid', user?.id || '');

                  if (updateError) {
                    console.error('❌ Error al actualizar descripción:', updateError);
                  }
                }
              } catch (aiError) {
                console.error('❌ Error en proceso de IA:', aiError);
                // No lanzar error, continuar con el flujo
              } finally {
                setGeneratingDescription(false);
                dispatch(setRefreshJournal(true));
              }
            } catch (journalError) {
              console.error('❌ Error al crear entrada del diario:', journalError);
              // No lanzar error, continuar con el flujo
            }
          }

          // Otorgar insignias y experiencia
          await awardSpecificBadges(user.id, 'completeMission');
          const expResult = await addExperienceToUser(user.id, foundMissionPoints);

          // Actualizar los puntos del usuario tras completar la misión
          const updatedPoints = await getUserPoints(user.id);
          setUserPoints(updatedPoints);

          // Actualizar información de misión completada con datos de experiencia
          setCompletedMissionInfo(prev => ({
            ...prev!,
            levelUp: expResult.leveledUp,
            newLevel: expResult.level,
            remainingXP: expResult.xp,
            xpNext: expResult.xpNext
          }));

        } catch (error) {
          console.error('Error en proceso de fondo:', error);
          Alert.alert('Error', 'Hubo un problema al procesar la misión. Por favor, inténtalo de nuevo.');
        } finally {
          setCompletingMission(false);
        }
      });

      // Mostrar el modal de misión completada
      setMissionCompleted(true);

    } catch (error) {
      console.error('Error al completar misión:', error);
      Alert.alert('Error', 'No se pudo completar la misión. Inténtalo de nuevo.');
      setCompletingMission(false);
    }
  };

  useEffect(() => {
    if (missionCompleted) {
      // Si la misión se completó, programar la navegación al diario
      const timer = setTimeout(() => {
        setMissionCompleted(false);
        navigation.navigate('Journal', { refresh: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [missionCompleted, navigation]);

  const handleShareJourney = async (friends: Friend[] | Friend) => {
    // Usar el ID del viaje de la misión específica si existe, de lo contrario usar el general
    const missionJourneyId = missionToShare ? missionToShare.journeyId : journeyId;
    
    if (!missionJourneyId || !user?.id) {
      // Cerrar el modal de compartir antes de mostrar el error
      setIsShareModalVisible(false);
      setMissionToShare(null);
      
      Alert.alert('Error', 'No se pudo compartir el viaje porque no se encontró el ID del viaje o no estás autenticado.');
      console.log('JourneyId:', missionJourneyId, 'UserId:', user?.id);
      // Navegar al MapScreen cuando ocurre este error específico
      navigation.navigate('Map');
      return;
    }

    try {
      console.log('Intentando compartir viaje:', missionJourneyId, 'con amigos:', friends);
      const success = await shareJourney(missionJourneyId, user.id, friends);
      if (success) {
        // Si el proceso fue exitoso, no necesitamos hacer nada más
        // ya que la función shareJourney muestra sus propias alertas
      }
    } catch (error) {
      console.error('Error al compartir viaje:', error);
      Alert.alert('Error', 'No se pudo compartir el viaje');
    } finally {
      setIsShareModalVisible(false);
      setMissionToShare(null); // Limpiar la misión seleccionada
    }
  };

  // Renderizar el loader de generación de descripción
  const renderGeneratingLoader = () => {
    if (generatingDescription) {
      return (
        <View style={styles.generatingLoaderOverlay}>
          <View style={styles.generatingLoaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.generatingText}>Generando descripción del diario...</Text>
            <Text style={styles.generatingSubtext}>Esto puede tardar unos momentos...</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#4CAF50" />
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus Ciudades</Text>
          <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
        </View>
        <ScrollView
          style={styles.citiesList}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {citiesData.map((city) => (
            <CityCard
              key={city.cityName}
              cityName={city.cityName}
              totalMissions={city.totalMissions}
              completedMissions={city.completedMissions}
              expiredMissions={city.expiredMissions}
              isShared={city.isShared}
              hasAcceptedShares={city.hasAcceptedShares}
              hasPendingShares={city.hasPendingShares}
              sharedUsers={city.sharedUsers}
              onPress={() => setSelectedCity(city.cityName)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cityData = cityMissions[selectedCity];
  const selectedCityData = citiesData.find(city => city.cityName === selectedCity);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCity(null)}
          activeOpacity={0.7}
        >
          {/* @ts-ignore */}
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
      </View>

      <View style={styles.cityTitleContainer}>
        <Text style={styles.cityTitle}>{selectedCity}</Text>
        
        {/* Mostrar los avatares de los usuarios compartidos en la pantalla de detalle */}
        {selectedCityData?.isShared && (
          <View style={styles.cityDetailSharedContainer}>
            <View style={[
              styles.sharedBadge,
              selectedCityData.hasAcceptedShares ? styles.acceptedBadge : selectedCityData.hasPendingShares ? styles.pendingBadge : {}
            ]}>
              <Ionicons 
                name={selectedCityData.hasAcceptedShares ? "people" : "people-outline"} 
                size={16} 
                color="#FFF" 
              />
              <Text style={styles.sharedBadgeText}>
                {selectedCityData.hasAcceptedShares 
                  ? "Compartido" 
                  : selectedCityData.hasPendingShares ? "Pendiente" : "Compartido"}
              </Text>
            </View>
            
            <View style={styles.cityDetailAvatars}>
              {selectedCityData?.sharedUsers?.map((user, index) => (
                <View 
                  key={user?.id || index} 
                  style={[
                    styles.detailAvatarWrapper,
                    { marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index },
                    user?.status === 'pending' && styles.detailPendingAvatarWrapper
                  ]}
                >
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={[
                        styles.detailAvatar,
                        user?.status === 'pending' && { opacity: 0.6 }
                      ]}
                    />
                  ) : (
                    <View style={[
                      styles.detailDefaultAvatar,
                      user?.status === 'pending' && styles.detailPendingDefaultAvatar
                    ]}>
                      <Text style={styles.detailAvatarText}>
                        {user?.username ? user.username.substring(0, 1).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Indicador de estado pendiente */}
                  {user?.status === 'pending' && (
                    <View style={styles.detailPendingIndicator}>
                      <Ionicons name="time-outline" size={12} color="#FF9800" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.missionsList}>
        {cityData.pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Misiones Pendientes</Text>
            {cityData.pending.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={(imageUrl) => handleCompleteMission(mission.id, imageUrl)}
                onShare={() => {
                  setMissionToShare(mission);
                  setIsShareModalVisible(true);
                }}
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
                onComplete={() => { }}
                onShare={() => {
                  setMissionToShare(mission);
                  setIsShareModalVisible(true);
                }}
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
                onComplete={() => { }}
                onShare={() => {
                  setMissionToShare(mission);
                  setIsShareModalVisible(true);
                }}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal de misión completada */}
      <MissionCompletedModal
        visible={missionCompleted}
        info={completedMissionInfo}
        onFinished={() => {
          setMissionCompleted(false);
          navigation.navigate('Journal', { refresh: true });
        }}
      />

      {/* Modal de carga durante el proceso */}
      <CompletingMissionModal
        visible={completingMission && !missionCompleted}
      />

      <FriendSelectionModal
        visible={isShareModalVisible}
        onClose={() => {
          setIsShareModalVisible(false);
          setMissionToShare(null);
        }}
        onSelect={handleShareJourney}
      />

      {renderGeneratingLoader()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginRight: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center'
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#005F9E',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cityTitleContainer: {
    marginBottom: 20,
  },
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 8,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    padding: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
    letterSpacing: 1,
    marginTop: 30,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  citiesList: {
    flex: 1,
  },
  cityCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
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
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 5,
    letterSpacing: 1,
  },
  missionCount: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#005F9E',
  },
  missionsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7F5AF0',
    marginBottom: 15,
    letterSpacing: 1,
  },
  completedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontSize: 16,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  completedCard: {
    opacity: 0.8,
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
    color: '#005F9E',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#7F5AF0',
    overflow: 'hidden',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  cardDescription: {
    color: '#333',
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
    color: '#7F5AF0',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#7F5AF0',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  expiredCard: {
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expiredTime: {
    color: '#D32F2F',
  },
  generatingLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  generatingLoaderContainer: {
    backgroundColor: 'rgba(127, 90, 240, 0.95)',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  generatingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  generatingSubtext: {
    color: 'white',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  shareIcon: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  friendItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  friendName: {
    fontSize: 16
  },
  friendPoints: {
    fontSize: 14,
    color: '#666'
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  levelUpContainer: {
    marginTop: 15,
    backgroundColor: '#7F5AF0',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  levelUpText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 95, 158, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingShareIndicator: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  acceptedShareIndicator: {
    backgroundColor: 'rgba(0, 95, 158, 0.1)',
  },
  sharedText: {
    fontSize: 12,
    color: '#005F9E',
    marginLeft: 4,
    fontWeight: '500',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7F5AF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  moreUsersAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreUsersText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cityDetailSharedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#005F9E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  acceptedBadge: {
    backgroundColor: '#005F9E',
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
  },
  sharedBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  cityDetailAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailAvatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  detailPendingAvatarWrapper: {
    borderColor: '#FF9800',
    opacity: 0.8,
  },
  detailAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  detailDefaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7F5AF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPendingDefaultAvatar: {
    backgroundColor: '#FF9800',
  },
  detailAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailPendingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pendingAvatarWrapper: {
    borderColor: '#FF9800',
    borderWidth: 2,
    opacity: 0.8,
  },
  pendingDefaultAvatar: {
    backgroundColor: '#FF9800',
  },
  pendingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
});

const MissionsScreen = (props: any) => {
  return (
    <SafeAreaViewContext style={styles.container}>
      <MissionsScreenComponent {...props} />
    </SafeAreaViewContext>
  );
};

export default MissionsScreen; 