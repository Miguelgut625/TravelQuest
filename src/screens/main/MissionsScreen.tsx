import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import Logo from '../../assets/icons/logo.png';

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

const MissionsScreen = () => {  
  const [journeyMissions, setJourneyMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingMission, setUpdatingMission] = useState<number | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');

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
        setUsername(data.username);
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
          .select('*')
          .eq('userId', user.id);
        if (error) throw error;
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logo} />
        </View>
        <Text style={styles.headerTitle}>Misiones de Viaje</Text>
        <Text style={styles.headerSubtitle}>¡Completa tus desafíos, {username}!</Text>
      </LinearGradient>
      <FlatList
        data={journeyMissions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.missionCard}>
            <Text style={styles.missionTitle}>{item.challenges?.title || 'Sin título'}</Text>
            <Text style={styles.difficultyLevel}>Nivel: {item.challenges?.difficulty || 'No especificado'}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    flexDirection: 'column',
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 18,
    color: colors.secondary,
    textAlign: 'center',
  },
  missionCard: {
    backgroundColor: colors.secondary,
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 4,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  difficultyLevel: {
    fontSize: 16,
    color: '#FFA000',
    marginVertical: 5,
  },
});

export default MissionsScreen;