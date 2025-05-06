// src/screens/main/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../services/supabase'; 
import { useNavigation } from '@react-navigation/native'; // Importa el hook de navegación
import { Ionicons } from '@expo/vector-icons'; // Importa los íconos de Ionicons
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';

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
    return (
      <SafeAreaViewRN style={styles.container}>
        <ActivityIndicator size={50} color="#F5D90A" />
      </SafeAreaViewRN>
    );
  }

  if (error) {
    return (
      <SafeAreaViewRN style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaViewRN>
    );
  }

  return (
    <SafeAreaViewRN style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#F5D90A" />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Tabla de clasificación</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={{ flex: 1 }}
      />
    </SafeAreaViewRN>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#F5D90A', // Amarillo misterioso
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#F5D90A', // Amarillo misterioso
    letterSpacing: 1,
  },
  itemContainer: {
    padding: 12,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#232634', // Fondo misterioso de las tarjetas
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  itemText: {
    fontSize: 18,
    color: '#E5E7EB', // Gris claro para mejor contraste, no blanco puro
  },
  firstPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5D90A', // Amarillo misterioso para el primer lugar
  },
  secondPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F5AF0', // Violeta misterioso para el segundo lugar
  },
  thirdPlaceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2CB67D', // Verde neón para el tercer lugar
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A1A1AA', // Gris claro para los demás lugares
  },
  errorText: {
    color: '#F5D90A', // Amarillo misterioso para errores
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },
});

export default LeaderboardScreen;