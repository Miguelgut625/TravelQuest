import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

interface Mission {
  id: number;
  challenges: {
    title: string;
    difficulty: string;
  };
}

const MissionsScreen = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;
  const dynamicStyles = getDynamicStyles(isSmallScreen);

  const [journeyMissions, setJourneyMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');

  const difficultyLevels = ['Fácil', 'Media', 'Difícil', 'Sin clasificar'];

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const [{ data: userData, error: userError }, { data: missionsData, error: missionsError }] = await Promise.all([
          supabase.from('users').select('username').eq('id', user.id).single(),
          supabase.from('journeys_missions').select('*').eq('userId', user.id),
        ]);

        if (userError) throw userError;
        if (missionsError) throw missionsError;

        setUsername(userData?.username || '');

        // ✅ Normalización robusta: acepta claves en inglés o español y mapea claramente
        const normalized = (missionsData || []).map((m: any) => {
          const challengeData = m.challenges || {};
          return {
            ...m,
            challenges: {
              title: challengeData.title || challengeData.Título || 'Sin título',
              difficulty: challengeData.difficulty || challengeData.Dificultad || 'Sin clasificar',
            },
          };
        });

        setJourneyMissions(normalized);
      } catch (err: any) {
        console.error('Error al obtener datos:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filterByDifficulty = (level: string) => {
    return journeyMissions.filter((m) => {
      const raw = m.challenges?.difficulty;
      if (!raw) return level === 'Sin clasificar';
      return normalize(raw) === normalize(level);
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={dynamicStyles.logo} />
        </View>
        <Text style={dynamicStyles.headerTitle}>Misiones de Viaje</Text>
        <Text style={dynamicStyles.headerSubtitle}>¡Completa tus desafíos, {username}!</Text>
      </LinearGradient>

      <View style={dynamicStyles.tableContainer}>
        {difficultyLevels.map((level) => {
          const missions = filterByDifficulty(level);
          return (
            <View key={level} style={dynamicStyles.column}>
              <Text style={dynamicStyles.columnTitle}>{level}</Text>
              {missions.length === 0 ? (
                <Text style={dynamicStyles.emptyText}>No hay misiones</Text>
              ) : (
                missions.map((mission) => (
                  <View key={mission.id} style={dynamicStyles.missionCard}>
                    <Text style={dynamicStyles.missionTitle}>
                      {mission.challenges.title}
                    </Text>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const getDynamicStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    logo: {
      width: isSmallScreen ? 60 : 100,
      height: isSmallScreen ? 60 : 100,
      resizeMode: 'contain',
    },
    headerTitle: {
      fontSize: isSmallScreen ? 20 : 26,
      fontWeight: 'bold',
      color: colors.secondary,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: isSmallScreen ? 14 : 18,
      color: colors.primary,
      textAlign: 'center',
    },
    tableContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      gap: 8,
    },
    column: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      padding: 8,
      elevation: 2,
    },
    columnTitle: {
      fontSize: isSmallScreen ? 14 : 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 8,
      textAlign: 'center',
      borderBottomWidth: 1,
      borderColor: '#ccc',
      paddingBottom: 4,
    },
    emptyText: {
      fontSize: 12,
      color: '#999',
      textAlign: 'center',
      marginTop: 10,
    },
    missionCard: {
      backgroundColor: '#f9f9f9',
      borderRadius: 6,
      padding: 8,
      marginBottom: 6,
      elevation: 1,
    },
    missionTitle: {
      fontSize: isSmallScreen ? 14 : 16,
      color: '#333',
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    padding: 16,
  },
  header: {
    padding: 60,
    paddingTop: 50,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
});

export default MissionsScreen;
