import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Mission } from '../../features/missionSlice';
import { supabase } from '../../services/supabase';
import { completeMission, getUserPoints } from '../../services/pointsService';
import { RouteProp } from '@react-navigation/native';

interface JourneyMission {
  id: string;
  challengeId: string;
  completed: boolean;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
  };
}

type MissionsScreenRouteProp = RouteProp<{
  Missions: {
    journeyId: string;
    challenges: JourneyMission[];
  };
}, 'Missions'>;

interface MissionsScreenProps {
  route: MissionsScreenRouteProp;
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

const MissionsScreen = ({ route }: MissionsScreenProps) => {
  const { journeyId, challenges } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [missions, setMissions] = useState<JourneyMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMissions = async () => {
    console.log('Parámetros recibidos:', { journeyId, challenges });

    if (!journeyId) {
      console.log('No se encontró journeyId en los parámetros de ruta');
      setError('No se encontró el viaje');
      setLoading(false);
      return;
    }

    try {
      console.log('Buscando misiones para journeyId:', journeyId);
      const { data, error } = await supabase
        .from('journeys_missions')
        .select(`
          id,
          challengeId,
          completed,
          challenge:challenges (
            title,
            description,
            difficulty,
            points
          )
        `)
        .eq('journeyId', journeyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error en la consulta de misiones:', error);
        throw error;
      }

      console.log('Misiones encontradas:', data);

      if (!data || data.length === 0) {
        console.log('No se encontraron misiones para este journey');
        setError('No se encontraron misiones para este viaje');
      } else {
        // Mantener el estado anterior si hay datos nuevos
        setMissions(prevMissions => {
          const newMissions = [...prevMissions];
          data.forEach((newMission: JourneyMission) => {
            const existingIndex = newMissions.findIndex(m => m.id === newMission.id);
            if (existingIndex === -1) {
              newMissions.push(newMission);
            } else {
              newMissions[existingIndex] = newMission;
            }
          });
          return newMissions;
        });
      }
    } catch (error) {
      console.error('Error fetching missions:', error);
      setError('Error al cargar las misiones');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (journeyId) {
      fetchMissions();
    }
  }, [journeyId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMissions();
  };

  const handleCompleteMission = async (missionId: string) => {
    if (!user?.id) return;

    try {
      const points = await completeMission(missionId, user.id);
      setUserPoints(prev => prev + points);

      // Actualizar el estado local inmediatamente
      setMissions(prevMissions =>
        prevMissions.map(mission =>
          mission.id === missionId
            ? { ...mission, completed: true }
            : mission
        )
      );

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

  if (loading && !isRefreshing) {
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
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tus Misiones</Text>
        <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
      </View>
      {missions.length === 0 ? (
        <Text style={styles.emptyText}>No hay misiones disponibles.</Text>
      ) : (
        <FlatList
          data={missions}
          renderItem={({ item }) => (
            <MissionCard
              mission={item}
              onComplete={() => handleCompleteMission(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          style={styles.list}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  list: {
    flex: 1,
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