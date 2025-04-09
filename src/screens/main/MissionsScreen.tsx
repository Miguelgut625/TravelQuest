import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
import MissionCompletedModal from '../../components/MissionCompletedModal';
import CompletingMissionModal from '../../components/CompletingMissionModal';

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

interface SharedJourney {
  journeyId: string;
  journeys: Journey;
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

const MissionCard = ({ mission, onComplete }: {
  mission: JourneyMission;
  onComplete: (imageUrl?: string) => void;
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

const MissionsScreenComponent = ({ route, navigation }: MissionsScreenProps) => {
  const { journeyId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [missions, setMissions] = useState<CityMissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [completedMissionInfo, setCompletedMissionInfo] = useState<{
    title: string;
    points: number;
    cityName: string;
  } | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const dispatch = useDispatch();
  const theme = useTheme();

  const fetchMissions = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      // Primero obtenemos los journeys propios del usuario
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
        .eq('userId', user.id);

      if (ownJourneysError) throw ownJourneysError;

      // Luego obtenemos los journeys compartidos con el usuario
      const { data: sharedJourneys, error: sharedJourneysError } = await supabase
        .from('journeys_shared')
        .select(`
          journeyId,
          journeys:journeyId (
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
        .eq('sharedWithUserId', user.id);

      if (sharedJourneysError) throw sharedJourneysError;

      // Combinamos los journeys propios y compartidos
      const allJourneys = [
        ...(ownJourneys || []),
        ...(sharedJourneys?.map((sj: SharedJourney) => sj.journeys) || [])
      ];

      if (!allJourneys || allJourneys.length === 0) {
        setError('No hay viajes disponibles');
        setLoading(false);
        return;
      }

      const allMissions = allJourneys.flatMap((journey: Journey) =>
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
          const timeRemaining = getTimeRemaining(mission.end_date);
          if (timeRemaining.isExpired) {
            missionsByCity[mission.cityName].expired.push(mission);
          } else {
            missionsByCity[mission.cityName].pending.push(mission);
          }
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

  const fetchInitialPoints = async () => {
    if (!user?.id) return;

    try {
      const { data: pointsData, error } = await supabase
        .from('users')
        .select('points')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (pointsData) {
        setUserPoints(pointsData.points || 0);
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  };

  useEffect(() => {
    fetchMissions();
    fetchInitialPoints();
  }, [journeyId]);

  const handleCompleteMission = async (missionId: string, imageUrl?: string) => {
    try {
      setCompletingMission(true);

      // Encontrar la misión en el estado local
      let foundMissionTitle = '';
      let foundMissionPoints = 0;
      let foundCityName = '';
      let foundMission: JourneyMission | null = null;

      Object.keys(missions).forEach((cityName) => {
        const pending = missions[cityName].pending;
        const mission = pending.find((m) => m.id === missionId);
        if (mission) {
          foundMissionTitle = mission.challenge.title;
          foundMissionPoints = mission.challenge.points;
          foundCityName = cityName;
          foundMission = mission;
        }
      });

      if (!foundMissionTitle || !foundCityName || !foundMission) {
        throw new Error('Misión no encontrada');
      }

      // Guardar información de la misión antes de completarla
      setCompletedMissionInfo({
        title: foundMissionTitle,
        points: foundMissionPoints,
        cityName: foundCityName
      });

      // Completar misión en la base de datos
      const result = await completeMission(
        missionId,
        user?.id || '',
        imageUrl
      );

      console.log('Resultado de completar la misión:', result);
      if (typeof result !== 'number') {
        throw new Error('Error al completar la misión');
      }

      // Crear entrada en el diario para esta misión completada
      if (imageUrl) {
        await createJournalEntry({
          userId: user?.id || '',
          cityId: foundCityName || '',
          missionId: missionId,
          title: `Misión completada: ${foundMissionTitle}`,
          content: `He completado la misión "${foundMissionTitle}" en ${foundCityName}. ¡Conseguí ${foundMissionPoints} puntos!`,
          photos: [imageUrl],
          tags: [foundCityName || '', 'Misión completada']
        });
      }

      // Actualizar el estado local
      setMissions((prev) => {
        const updatedMissions = { ...prev };
        const city = updatedMissions[foundCityName];

        // Encontrar el índice de la misión en las pendientes
        const index = city.pending.findIndex((m) => m.id === missionId);

        if (index !== -1) {
          // Obtener la misión y marcarla como completada
          const mission = { ...city.pending[index], completed: true };

          // Eliminar la misión de pendientes
          city.pending.splice(index, 1);

          // Añadir la misión a completadas
          city.completed.push(mission);
        }

        return updatedMissions;
      });

      // Actualizar la UI de puntos
      setUserPoints((prev) => prev + foundMissionPoints);

      // Actualizar el estado global
      dispatch(dispatchCompleteMission(missionId));
      dispatch(setRefreshJournal(true));

      // Lógica para actualizar XP y nivel
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('xp, level, xp_next')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;

      if (userData) {
        const xpToAdd = Math.floor(foundMissionPoints / 2);

        // Calcular nueva XP temporal
        let tempXp = userData.xp + xpToAdd;
        
        let newLvl = userData.level;
        let newNextXp = userData.xp_next;
        let newXp = tempXp;
        
        if (tempXp >= userData.xp_next) {
          // Subir de nivel
          newLvl += 1;
        
          // Calcular el exceso de XP
          const leftoverXp = tempXp - userData.xp_next;
        
          // XP actual se reinicia, se suma el excedente
          newXp = leftoverXp;
        
          // Aumentar el xp_next en un 10%
          newNextXp = Math.floor(userData.xp_next * 1.1);
        }

        // Actualizar usuario en Supabase
        const { error: updateError } = await supabase
          .from('users')
          .update({
            xp: newXp,
            level: newLvl,
            xp_next: newNextXp
          })
          .eq('id', user?.id);

        if (updateError) {
          throw updateError;
        }

        // Actualizar los puntos del usuario local
        setUserPoints(newXp);
      }

      // Mostrar el modal de misión completada
      setMissionCompleted(true);

      // Recargar las misiones para asegurar que el estado está actualizado
      await fetchMissions();

    } catch (error) {
      console.error('Error al completar la misión:', error);
      Alert.alert('Error', 'No se pudo completar la misión. Inténtalo de nuevo.');
      setMissionCompleted(false);
    } finally {
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
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal de misión completada */}
      <MissionCompletedModal
        visible={missionCompleted}
        missionInfo={completedMissionInfo}
        onFinished={() => {
          setMissionCompleted(false);
          navigation.navigate('Journal', { refresh: true });
        }}
      />

      {/* Modal de carga durante el proceso */}
      <CompletingMissionModal
        visible={completingMission && !missionCompleted}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  expiredCard: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expiredTime: {
    color: '#f44336',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
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
  }
});

const MissionsScreen = (props: any) => {
  return <MissionsScreenComponent {...props} />;
};

export default MissionsScreen; 