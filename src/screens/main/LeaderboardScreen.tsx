// src/screens/main/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native'; // Importa el hook de navegación
import { Ionicons } from '@expo/vector-icons'; // Importa los íconos de Ionicons
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { useTheme } from '../../context/ThemeContext';
import { getLeaderboardScreenStyles } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LeaderboardItem {
  id: string;
  username: string;
  points: number;
}

const LeaderboardScreen = () => {
  const navigation = useNavigation(); // Obtén el objeto de navegación
  const { user } = useSelector((state: RootState) => state.auth);
  const { colors, isDarkMode } = useTheme();
  const { width } = Dimensions.get('window');
  const styles = getLeaderboardScreenStyles(colors, isDarkMode, width);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, points') // Asegúrate de incluir el campo id
          .order('points', { ascending: false });

        if (error) throw error;

        // Limitar a los 10 primeros usuarios
        setLeaderboardData(data.slice(0, 10));
      } catch (err: any) { // Especifica el tipo de 'err' como 'any'
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const renderItem = ({ item, index }: { item: LeaderboardItem; index: number }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        if (user && item.id === user.id) {
          navigation.navigate('Profile');
        } else {
          navigation.navigate('FriendProfile', { friendId: item.id, friendName: item.username, rankIndex: index });
        }
      }}
      activeOpacity={0.85}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{index + 1}.</Text>
        <View style={styles.usernameContainer}>
          <Text style={styles.usernameText}>{item.username}</Text>
        </View>
      </View>
      <Text style={styles.pointsText}>{item.points} puntos</Text>
      {index === 0 && <Text style={styles.firstPlaceText}>🏆 Explorador Supremo</Text>}
      {index === 1 && <Text style={styles.secondPlaceText}>🌍 Aventurero Global</Text>}
      {index === 2 && <Text style={styles.thirdPlaceText}>✈️ Viajero Frecuente</Text>}
      {index > 2 && <Text style={styles.titleText}>🌍 Viajero Experto</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size={50} color={colors.secondary} />
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? colors.background : colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top, backgroundColor: isDarkMode ? colors.background : colors.primary }]}>
        <TouchableOpacity
          style={[styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color={isDarkMode ? '#181C22' : '#fff'} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: isDarkMode ? colors.accent : '#fff', flex: 1, textAlign: 'center' }]}>Tabla de clasificación</Text>
        </View>
        <View style={styles.rightSpace} />
      </View>
      <Text style={[styles.pointsText, { textAlign: 'center', marginBottom: 8, color: isDarkMode ? colors.text.secondary : styles.pointsText.color }]}>¡Compite con otros viajeros y sube en la tabla de clasificación!</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </SafeAreaView>
  );
};

export default LeaderboardScreen;