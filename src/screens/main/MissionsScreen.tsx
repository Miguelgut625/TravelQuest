import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../services/supabase';
import { RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { completeMission } from '../../services/pointsService';

// Definir la interfaz para los desafíos que vienen de Supabase
interface SupabaseChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: string; // Ahora es difficulty en minúsculas
  points: number;
  cityId: string;
  duration: number;
  city: {
    name: string;
  };
  completed: boolean;
}

type RootStackParamList = {
  Missions: {
    refresh?: number;
    city?: string;
  };
};

const MissionCard = ({ challenge, onComplete, disabled }: { 
  challenge: SupabaseChallenge; 
  onComplete: () => void;
  disabled: boolean;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{challenge.title}</Text>
      <Text style={[styles.badge, { backgroundColor: challenge.completed ? '#4CAF50' : '#FFA000' }]}>
        {challenge.completed ? 'Completada' : 'Pendiente'}
      </Text>
    </View>
    {challenge.city?.name && (
      <Text style={styles.cardLocation}>📍 {challenge.city.name}</Text>
    )}
    <Text style={styles.cardDescription}>{challenge.description}</Text>
    <View style={styles.cardFooter}>
      <Text style={styles.difficulty}>Dificultad: {challenge.difficulty}</Text>
      <Text style={styles.points}>{challenge.points} puntos</Text>
    </View>
    {!challenge.completed && (
      <TouchableOpacity 
        style={[styles.completeButton, disabled && styles.disabledButton]} 
        onPress={onComplete}
        disabled={disabled}
      >
        <Text style={styles.completeButtonText}>
          {disabled ? 'Completando...' : 'Completar Misión'}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

const MissionsScreen = ({ route }: { route?: RouteProp<RootStackParamList, 'Missions'> }) => {
  const [challenges, setChallenges] = useState<SupabaseChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMission, setCompletingMission] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const handleCompleteMission = async (missionId: string) => {
    if (!userId) return;
    
    try {
      setCompletingMission(missionId);
      const points = await completeMission(missionId, userId);
      
      // Actualizar el estado local
      setChallenges(prevChallenges => 
        prevChallenges.map(challenge => 
          challenge.id === missionId 
            ? { ...challenge, completed: true }
            : challenge
        )
      );

      Alert.alert(
        '¡Misión Completada!',
        `Has ganado ${points} puntos por completar esta misión.`
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo completar la misión. Por favor, intenta de nuevo.'
      );
    } finally {
      setCompletingMission(null);
    }
  };

  useEffect(() => {
    const fetchChallenges = async () => {
      if (!userId) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('journeys_missions')
          .select(`
            id,
            completed,
            challenge:challenges!inner(
              id,
              title,
              description,
              difficulty,
              points,
              cityId,
              duration,
              city:cities!inner(
                id,
                name
              )
            ),
            journey:journeys!inner(
              id,
              userId
            )
          `)
          .eq('journey.userId', userId);

        // Si hay una ciudad especificada, filtrar por ella
        if (route?.params?.city) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('id')
            .eq('name', route.params.city)
            .single();

          if (cityData) {
            query = query.eq('challenge.cityId', cityData.id);
          }
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) throw new Error(supabaseError.message);

        if (data) {
          // Transformar los datos para que coincidan con la interfaz SupabaseChallenge
          const formattedChallenges = data.map((item: { challenge: any; completed: boolean; id: string }) => ({
            ...item.challenge,
            id: item.id, // Usar el ID de journeys_missions como key única
            completed: item.completed
          }));
          setChallenges(formattedChallenges);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [route?.params, userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando desafíos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error al cargar desafíos: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tus Desafíos</Text>
      {challenges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay desafíos disponibles.</Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          renderItem={({ item }) => (
            <MissionCard 
              challenge={item} 
              onComplete={() => handleCompleteMission(item.id)}
              disabled={!!completingMission}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
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
  cardLocation: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
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
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default MissionsScreen; 