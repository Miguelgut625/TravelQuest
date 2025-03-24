import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { completeMission } from '../../services/pointsService';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ProgressBar, useTheme, Surface } from 'react-native-paper';
import { JourneyMission } from '../../types/journey';
import { completeMission as dispatchCompleteMission } from '../../features/journey/journeySlice';

type MissionsScreenRouteProp = RouteProp<{
  Missions: {
    journeyId: string;
    challenges: JourneyMission[];
  };
}, 'Missions'>;

interface MissionsScreenProps {
  route: MissionsScreenRouteProp;
}

interface CityMissions {
  [cityName: string]: {
    completed: JourneyMission[];
    pending: JourneyMission[];
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
    challenges: {
      id: string;
      title: string;
      description: string;
      difficulty: string;
      points: number;
    };
  }[];
}

const MissionCard = ({ mission, onComplete }: { mission: JourneyMission; onComplete: () => void }) => (
  <TouchableOpacity
    style={[styles.card, mission.completed && styles.completedCard]}
    onPress={() => !mission.completed && onComplete()}
    disabled={mission.completed}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
      <Text style={[styles.badge, { backgroundColor: mission.completed ? '#4CAF50' : '#FFA000' }]}>
        {mission.completed ? 'Completada' : 'Pendiente'}
      </Text>
    </View>
    <Text style={styles.cardDescription}>{mission.challenge.description}</Text>
    <View style={styles.cardFooter}>
      <Text style={styles.difficulty}>Dificultad: {mission.challenge.difficulty}</Text>
      <Text style={styles.points}>{mission.challenge.points} puntos</Text>
    </View>
  </TouchableOpacity>
);

const CityCard = ({ cityName, totalMissions, completedMissions, onPress }: { 
  cityName: string; 
  totalMissions: number;
  completedMissions: number;
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

const MissionsScreen = ({ route }: MissionsScreenProps) => {
  const { journeyId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [missions, setMissions] = useState<JourneyMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityMissions, setCityMissions] = useState<CityMissions>({});
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
            pending: []
          };
        }
        if (mission.completed) {
          missionsByCity[mission.cityName].completed.push(mission);
        } else {
          missionsByCity[mission.cityName].pending.push(mission);
        }
      });

      setCityMissions(missionsByCity);
      setMissions(allMissions);
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

  const handleCompleteMission = async (missionId: string) => {
    if (!user?.id) return;

    try {
      const points = await completeMission(missionId, user.id);
      setUserPoints(prev => prev + points);

      // Actualizar el estado local
      const updatedMissions = missions.map(mission =>
        mission.id === missionId ? { ...mission, completed: true } : mission
      );
      setMissions(updatedMissions);

      // Actualizar cityMissions
      const newCityMissions = { ...cityMissions };
      Object.keys(newCityMissions).forEach(cityName => {
        const mission = newCityMissions[cityName].pending.find(m => m.id === missionId);
        if (mission) {
          newCityMissions[cityName].pending = newCityMissions[cityName].pending.filter(m => m.id !== missionId);
          newCityMissions[cityName].completed.push({ ...mission, completed: true });
        }
      });
      setCityMissions(newCityMissions);

      Alert.alert(
        '¡Misión Completada!',
        `Has ganado ${points} puntos por completar esta misión.`
      );
    } catch (error) {
      console.error('Error completing mission:', error);
      Alert.alert(
        'Error',
        'No se pudo completar la misión. Por favor, intenta de nuevo.'
      );
    }
  };

  const handleMissionComplete = (missionId: string) => {
    dispatch(dispatchCompleteMission(missionId));
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
          {Object.entries(cityMissions).map(([cityName, missions]) => (
            <CityCard
              key={cityName}
              cityName={cityName}
              totalMissions={missions.completed.length + missions.pending.length}
              completedMissions={missions.completed.length}
              onPress={() => setSelectedCity(cityName)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const cityData = cityMissions[selectedCity];

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
                onComplete={() => handleMissionComplete(mission.id)}
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
              />
            ))}
          </>
        )}
      </ScrollView>
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
});

export default MissionsScreen; 