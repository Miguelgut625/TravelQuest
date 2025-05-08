// src/screens/main/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native'; // Importa el hook de navegación
import { Ionicons } from '@expo/vector-icons'; // Importa los íconos de Ionicons

interface LeaderboardItem {
  id: string; // Asegúrate de que este campo exista en tu tabla
  username: string; // Cambia 'username' si el campo tiene otro nombre
  points: number;
}

const LeaderboardScreen = () => {
  const navigation = useNavigation(); // Obtén el objeto de navegación
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <View style={styles.itemContainer}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{index + 1}.</Text>
        <Text style={styles.usernameText}>{item.username}</Text>
      </View>
      <Text style={styles.pointsText}>{item.points} puntos</Text>
      {index === 0 && <Text style={styles.firstPlaceText}>🏆 Explorador Supremo</Text>}
      {index === 1 && <Text style={styles.secondPlaceText}>🌍 Aventurero Global</Text>}
      {index === 2 && <Text style={styles.thirdPlaceText}>✈️ Viajero Frecuente</Text>}
      {index > 2 && <Text style={styles.titleText}>🌍 Viajero Experto</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size={50} color="#005F9E" />
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#005F9E" />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Tabla de clasificación</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Mismo color de fondo que en FriendProfileScreen
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#005F9E', // Consistente con el color de la app
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#005F9E', // Consistente con el color de la app
  },
  itemContainer: {
    padding: 16,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
    marginRight: 8,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  pointsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  firstPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  secondPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C0C0C0',
  },
  thirdPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CD7F32',
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LeaderboardScreen;