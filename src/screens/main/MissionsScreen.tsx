import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

interface JourneyMission {
  id: number;
  created_at: string;
  completed: boolean;
  journeyId: number;
  challengeId: number;
  userId: string;
  journeys: {
    description: string;
  };
  challenges: {
    title: string;
    description: string;
  };
  user: {
    username: string;
  };
}

const MissionsScreen = () => {  
  const [journeyMissions, setJourneyMissions] = useState<JourneyMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingMission, setUpdatingMission] = useState<number | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUsername(data.username);
        }
      } catch (err: any) {
        console.error('Error al obtener el username:', err.message);
      }
    };

    fetchUsername();
  }, [user]);

  useEffect(() => {
    const fetchUserMissions = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('journeys_missions')
          .select(`
            *,
            journeys (
              description
            ),
            challenges (
              title,
              description
            ),
            user:users (
              username
            )
          `)
          .eq('userId', user.id);

        if (error) throw error;

        console.log('Misiones del usuario:', data);
        setJourneyMissions(data || []);
      } catch (err: any) {
        console.error('Error al obtener las misiones:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserMissions();
  }, [user]);

  const handleCompleteMission = async (missionId: number) => {
    try {
      setUpdatingMission(missionId);
      
      const { error } = await supabase
        .from('journeys_missions')
        .update({ completed: true })
        .eq('id', missionId);

      if (error) throw error;

      // Actualizar el estado local
      setJourneyMissions(journeyMissions.map(mission => 
        mission.id === missionId 
          ? { ...mission, completed: true }
          : mission
      ));
    } catch (err: any) {
      console.error('Error al completar la misión:', err.message);
    } finally {
      setUpdatingMission(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Cargando misiones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#2E7D32']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Misiones de Viaje</Text>
        <Text style={styles.headerSubtitle}>¡Completa tus desafíos, {username}!</Text>
      </LinearGradient>

      {journeyMissions.map((mission) => (
        <View key={mission.id} style={styles.missionCard}>
          <LinearGradient
            colors={['#ffffff', '#f8f8f8']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.missionTitle}>{mission.challenges?.title || 'Sin título'}</Text>
                <Text style={[
                  styles.statusBadge,
                  mission.completed ? styles.statusCompleted : styles.statusPending
                ]}>
                  {mission.completed ? '✓ Completada' : '⏳ Pendiente'}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(mission.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Descripción del Viaje</Text>
                <Text style={styles.detailValue}>{mission.journeys?.description || 'Sin descripción'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Descripción del Desafío</Text>
                <Text style={styles.detailValue}>{mission.challenges?.description || 'Sin descripción'}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Usuario:</Text>
                <Text style={styles.userValue}>{mission.user?.username || username}</Text>
              </View>
            </View>

            {!mission.completed && (
              <TouchableOpacity 
                style={styles.completeButton}
                onPress={() => handleCompleteMission(mission.id)}
                disabled={updatingMission === mission.id}
              >
                {updatingMission === mission.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.completeButtonText}>Completar Misión</Text>
                )}
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      ))}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  missionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#EF6C00',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  userLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  userValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    padding: 16,
  },
});

export default MissionsScreen; 