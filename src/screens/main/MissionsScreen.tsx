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
import { completeMission as dispatchCompleteMission } from '../../features/journeySlice';
import { FlatList } from 'react-native';
import { useWindowDimensions } from 'react-native';

const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

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
    expired: JourneyMission[];
  };
}

interface Journey {
  id: string;
  description: string;
  created_at: string;
  start_date: string;
  end_date: string;
  cities?: {
    name: string;
  };
  journeys_missions: {
    id: string;
    completed: boolean;
    challengeId: string;
    start_date: string;
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

const MissionCard = ({ mission, onComplete }: { mission: JourneyMission; onComplete: () => void }) => {
  const timeRemaining = getTimeRemaining(mission.end_date);
  const isExpired = timeRemaining.isExpired && !mission.completed;

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        mission.completed && styles.completedCard,
        isExpired && styles.expiredCard
      ]}
      onPress={() => !mission.completed && !isExpired && onComplete()}
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
  );
};

const CityCard = ({ cityName, totalMissions, completedMissions, expiredMissions, onPress }: { 
  cityName: string; 
  totalMissions: number;
  completedMissions: number;
  expiredMissions: number;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.cityCard} onPress={onPress}>
    <View style={styles.cityCardContent}>
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{cityName}</Text>
        <View style={styles.missionCountContainer}>
          <Text style={styles.missionCount}>
            {completedMissions}/{totalMissions} misiones completadas
          </Text>
          {expiredMissions > 0 && (
            <Text style={styles.expiredCount}>
              {expiredMissions} misiones expiradas
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </View>
    <View style={styles.progressBar}>
      <View 
        style={[
          styles.progressFillCompleted, 
          { width: `${(completedMissions / totalMissions) * 100}%` }
        ]} 
      />
      <View 
        style={[
          styles.progressFillExpired, 
          { 
            width: `${(expiredMissions / totalMissions) * 100}%`,
            left: `${(completedMissions / totalMissions) * 100}%`
          }
        ]} 
      />
      <View 
        style={[
          styles.progressFillPending, 
          { 
            width: `${((totalMissions - completedMissions - expiredMissions) / totalMissions) * 100}%`,
            left: `${((completedMissions + expiredMissions) / totalMissions) * 100}%`
          }
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

  const { width } = useWindowDimensions();
  const cardWidth = width * 0.17;
  const cardMargin = width * 0.02;
  const numColumns = Math.floor(width / (cardWidth + cardMargin * 2)) || 1;


  interface JourneyMissionWithCity extends JourneyMission {
    cityName: string;
  }
  
  const fetchMissions = async (
    userId: string,
    setCityMissions: React.Dispatch<React.SetStateAction<CityMissions>>,
    setMissions: React.Dispatch<React.SetStateAction<JourneyMissionWithCity[]>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          description,
          created_at,
          start_date,
          end_date,
          userId,
          cities ( name ),
          journeys_missions (
            id,
            completed,
            challengeId,
            start_date,
            end_date,
            challenges (
              id,
              title,
              description,
              difficulty,
              points
            )
          )
        `)
        .eq('userId', userId)
        .order('created_at', { ascending: false });
  
      if (journeysError) throw journeysError;
      if (!journeys || journeys.length === 0) {
        setError('No hay viajes disponibles');
        setLoading(false);
        return;
      }
  
      const allMissions: JourneyMissionWithCity[] = journeys.flatMap((journey: Journey) =>
        journey.journeys_missions.map((jm): JourneyMissionWithCity => ({
          id: jm.id,
          completed: jm.completed,
          cityName: journey.cities?.name || 'Ciudad Desconocida',
          start_date: jm.start_date || journey.start_date,
          end_date: jm.end_date || journey.end_date,
          challenge: {
            title: jm.challenges.title,
            description: jm.challenges.description,
            difficulty: jm.challenges.difficulty,
            points: jm.challenges.points,
          },
        }))
      );
  
      const missionsByCity: CityMissions = {};
      allMissions.forEach((mission) => {
        if (!missionsByCity[mission.cityName]) {
          missionsByCity[mission.cityName] = { completed: [], pending: [], expired: [] };
        }
        const timeRemaining = getTimeRemaining(mission.end_date);
        if (mission.completed) missionsByCity[mission.cityName].completed.push(mission);
        else if (timeRemaining.isExpired) missionsByCity[mission.cityName].expired.push(mission);
        else missionsByCity[mission.cityName].pending.push(mission);
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
    if (user?.id) {
      fetchMissions(user.id, setCityMissions, setMissions, setError, setLoading);
    }
  }, [journeyId, user?.id]);
  

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
    handleCompleteMission(missionId);
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
        <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          if (user?.id) {
            fetchMissions(user.id, setCityMissions, setMissions, setError, setLoading);
          }
        }}
      >
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
        <FlatList
          data={Object.entries(cityMissions)}
          keyExtractor={([cityName]) => cityName}
          numColumns={numColumns}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const [cityName, missions] = item;
            return (
              <View style={{ width: cardWidth, margin: cardMargin }}>
                <CityCard
                  cityName={cityName}
                  totalMissions={missions.completed.length + missions.pending.length + missions.expired.length}
                  completedMissions={missions.completed.length}
                  expiredMissions={missions.expired.length}
                  onPress={() => setSelectedCity(cityName)}
                />
              </View>
            );
          }}
        />
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
    backgroundColor: colors.backgroundGradient[1],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
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
    backgroundColor: colors.backgroundGradient[1],
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGradient[1],
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    padding: 16,
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
  missionCountContainer: {
    flexDirection: 'column',
  },
  missionCount: {
    fontSize: 14,
    color: '#666',
  },
  expiredCount: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFillCompleted: {
    height: '100%',
    backgroundColor: '#4CAF50',
    position: 'absolute',
    left: 0,
  },
  progressFillExpired: {
    height: '100%',
    backgroundColor: '#f44336',
    position: 'absolute',
  },
  progressFillPending: {
    height: '100%',
    backgroundColor: '#FFA000',
    position: 'absolute',
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
  badgeContainer: {
    alignItems: 'flex-end',
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
  cityGridContainer: {
    paddingBottom: 20,
  },
  cityGridRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cityGridItem: {
    flex: 1,
    marginHorizontal: 5,
    minWidth: 160,
    maxWidth: 240,
  },
  cityCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    height: 150, // por ejemplo
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  
});


export default MissionsScreen; 