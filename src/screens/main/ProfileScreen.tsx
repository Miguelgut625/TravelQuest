import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { getUserPoints } from '../../services/pointsService';
import { useFocusEffect } from '@react-navigation/native';

interface UserStats {
  points: number;
  completedMissions: number;
  citiesWithMissions: number;
}

interface CompletedMission {
  challenge: {
    cityId: string;
  };
}

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    points: 0,
    completedMissions: 0,
    citiesWithMissions: 0
  });

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Obtener puntos del usuario
      const points = await getUserPoints(user.id);

      // Obtener misiones completadas y ciudades
      const { data: completedMissions, error: missionsError } = await supabase
        .from('journeys_missions')
        .select(`
          id,
          completed,
          challenge:challenges!inner(
            cityId
          ),
          journey:journeys!inner(
            userId
          )
        `)
        .eq('journey.userId', user.id)
        .eq('completed', true);

      if (missionsError) throw missionsError;

      // Obtener ciudades únicas donde el usuario ha completado misiones
      const uniqueCities = new Set(completedMissions?.map((mission: CompletedMission) => mission.challenge.cityId) || []);

      setStats({
        points: points,
        completedMissions: completedMissions?.length || 0,
        citiesWithMissions: uniqueCities.size
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserStats();
    }, [user?.id])
  );

  const handleLogout = () => {
    dispatch(logout());
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={user?.profilePicture ? { uri: user.profilePicture } : require('../../assets/icons/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.points}</Text>
          <Text style={styles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completedMissions}</Text>
          <Text style={styles.statLabel}>Misiones</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.citiesWithMissions}</Text>
          <Text style={styles.statLabel}>Ciudades</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas de Aventuras</Text>
        <View style={styles.journalStats}>
          <Text style={styles.journalStat}>Misiones completadas: {stats.completedMissions}</Text>
          <Text style={styles.journalStat}>Ciudades exploradas: {stats.citiesWithMissions}</Text>
          <Text style={styles.journalStat}>Puntos totales: {stats.points}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  journalStats: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  journalStat: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen; 