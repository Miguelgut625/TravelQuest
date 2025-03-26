import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout } from '../../features/authSlice';

const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

const ProfileScreen = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;
  const dynamicStyles = getDynamicStyles(isSmallScreen);

  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { completedMissions } = useSelector((state: RootState) => state.missions);
  const entries = useSelector((state: RootState) => state.journal.entries);

  const totalPoints = completedMissions.reduce((sum, mission) => sum + mission.points, 0);
  const totalCities = Object.keys(entries).length;
  const totalEntries = Object.values(entries).flat().length;

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={dynamicStyles.logo} />
        </View>
        <Image
          source={
            user?.profilePicture
              ? { uri: user.profilePicture }
              : require('../../assets/icons/avatar.png')
          }
          style={dynamicStyles.avatar}
        />
        <Text style={dynamicStyles.username}>{user?.username}</Text>
        <Text style={dynamicStyles.email}>{user?.email}</Text>
      </LinearGradient>

      <View style={dynamicStyles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={dynamicStyles.statNumber}>{totalPoints}</Text>
          <Text style={dynamicStyles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={dynamicStyles.statNumber}>{completedMissions.length}</Text>
          <Text style={dynamicStyles.statLabel}>Misiones</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={dynamicStyles.statNumber}>{totalCities}</Text>
          <Text style={dynamicStyles.statLabel}>Ciudades</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas del Diario</Text>
        <View style={styles.journalStats}>
          <Text style={dynamicStyles.journalStat}>Total de entradas: {totalEntries}</Text>
          <Text style={dynamicStyles.journalStat}>Ciudades visitadas: {totalCities}</Text>
        </View>
      </View>

      <TouchableOpacity style={dynamicStyles.logoutButton} onPress={handleLogout}>
        <Text style={dynamicStyles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const getDynamicStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    logo: {
      width: isSmallScreen ? 60 : 100,
      height: isSmallScreen ? 60 : 100,
      resizeMode: 'contain',
    },
    avatar: {
      width: isSmallScreen ? 80 : 100,
      height: isSmallScreen ? 80 : 100,
      borderRadius: 40,
      marginBottom: 10,
    },
    username: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: 'bold',
      color: colors.secondary,
      marginBottom: 5,
    },
    email: {
      fontSize: isSmallScreen ? 14 : 16,
      color: 'rgba(255,255,255,0.8)',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: isSmallScreen ? 15 : 20,
      backgroundColor: colors.secondary,
      marginTop: -20,
      marginHorizontal: 20,
      borderRadius: 10,
      elevation: 5,
    },
    statNumber: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: isSmallScreen ? 12 : 14,
      color: '#666',
    },
    journalStat: {
      fontSize: isSmallScreen ? 14 : 16,
      color: '#666',
      marginBottom: 5,
    },
    logoutButton: {
      margin: 20,
      backgroundColor: colors.danger,
      padding: isSmallScreen ? 12 : 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    logoutButtonText: {
      color: colors.secondary,
      fontSize: isSmallScreen ? 14 : 16,
      fontWeight: 'bold',
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
  },
  header: {
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
  statCard: {
    alignItems: 'center',
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
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 10,
    elevation: 3,
  },
});

export default ProfileScreen;
