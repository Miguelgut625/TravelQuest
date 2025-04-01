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
          .select('username, points') 
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
      <Text style={styles.itemText}>
        {index + 1}. {item.username}: {item.points} puntos
        {index === 0 && <Text style={styles.firstPlaceText}> 🏆 Explorador Supremo</Text>}
        {index === 1 && <Text style={styles.secondPlaceText}> 🌍 Aventurero Global</Text>}
        {index === 2 && <Text style={styles.thirdPlaceText}> ✈️ Viajero Frecuente</Text>}
        {index > 2 && <Text style={styles.titleText}> 🌍 Viajero Experto</Text>}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#007bff" /> {/* Icono de flecha */}
      </TouchableOpacity>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa', // Color de fondo
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    zIndex: 1, // Asegúrate de que esté por encima de otros elementos
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#343a40', // Color del texto del título
  },
  itemContainer: {
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff', // Color de fondo de los elementos
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2, // Para Android
  },
  itemText: {
    fontSize: 18,
    color: '#495057', // Color del texto de los elementos
  },
  firstPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700', // Color dorado para el primer lugar
  },
  secondPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C0C0C0', // Color plateado para el segundo lugar
  },
  thirdPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CD7F32', // Color bronce para el tercer lugar
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff', // Color para los títulos de los demás lugares
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LeaderboardScreen;