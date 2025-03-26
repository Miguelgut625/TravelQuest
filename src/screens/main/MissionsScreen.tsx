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
import { LinearGradient } from 'expo-linear-gradient';
import generateMission from '../../services/missionGenerator';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
}

const MissionsScreen = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;
  const dynamicStyles = getDynamicStyles(isSmallScreen);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);

  const difficultyLevels = ['Fácil', 'Media', 'Difícil'];

  useEffect(() => {
    const fetchChallenges = async () => {
      if (!user?.id) return;
      setLoading(true);

      try {
        const { challenges: generated } = await generateMission('Alicante', 3, 4, user.id);
        setChallenges(generated);
      } catch (err: any) {
        console.error('Error al generar misiones:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [user]);

  const normalize = (text: string) =>
    text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const filterByDifficulty = (level: string) => {
    return challenges.filter((c) => normalize(c.difficulty) === normalize(level));
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
        <Text style={dynamicStyles.headerSubtitle}>Desafíos generados para ti</Text>
      </LinearGradient>

      <View style={dynamicStyles.tableContainer}>
        {difficultyLevels.map((level) => {
          const filtered = filterByDifficulty(level);
          return (
            <View key={level} style={dynamicStyles.column}>
              <Text style={dynamicStyles.columnTitle}>{level}</Text>
              {filtered.length === 0 ? (
                <Text style={dynamicStyles.emptyText}>No hay misiones</Text>
              ) : (
                filtered.map((mission) => (
                  <View key={mission.id} style={dynamicStyles.missionCard}>
                    <Text style={dynamicStyles.missionTitle}>{mission.title}</Text>
                    <Text style={dynamicStyles.missionDescription}>{mission.description}</Text>
                    <Text style={dynamicStyles.missionInfo}>Puntos: {mission.points}</Text>
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
      fontWeight: 'bold',
    },
    missionDescription: {
      fontSize: 13,
      color: '#555',
      marginTop: 4,
    },
    missionInfo: {
      fontSize: 12,
      color: '#777',
      marginTop: 2,
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