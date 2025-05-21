// src/screens/main/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native'; // Importa el hook de navegación
import { Ionicons } from '@expo/vector-icons'; // Importa los íconos de Ionicons
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

interface LeaderboardItem {
  id: string; // Asegúrate de que este campo exista en tu tabla
  username: string; // Cambia 'username' si el campo tiene otro nombre
  points: number;
}

const { width, height } = Dimensions.get('window');


const LeaderboardScreen = () => {
  const navigation = useNavigation(); // Obtén el objeto de navegación
  const { user } = useSelector((state: RootState) => state.auth);
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
        <TouchableOpacity
          onPress={() => {
            if (user && item.id === user.id) {
              navigation.navigate('Profile');
            } else {
              navigation.navigate('FriendProfile', { friendId: item.id, friendName: item.username, rankIndex: index });
            }
          }}
          style={styles.usernameContainer}
        >
          <Text style={styles.usernameText}>{item.username}</Text>
        </TouchableOpacity>
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
        <Ionicons name="arrow-back" size={24} color={colors.secondary} />
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
const colors = {
  primary: '#26547C',      // Azul oscuro (fuerte pero amigable)
  secondary: '#70C1B3',    // Verde agua (fresco y cálido)
  background: '#F1FAEE',   // Verde muy claro casi blanco (limpio y suave)
  white: '#FFFFFF',        // Blanco neutro
  text: {
    primary: '#1D3557',    // Azul muy oscuro (excelente legibilidad)
    secondary: '#52B788',  // Verde medio (agradable para texto secundario)
    light: '#A8DADC',      // Verde-azulado pastel (ligero, decorativo)
  },
  border: '#89C2D9',       // Azul claro (suave y limpio)
  success: '#06D6A0',      // Verde menta (positivo y moderno)
  error: '#FF6B6B',        // Rojo coral (alerta suave y visualmente amigable)
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: width < 400 ? 6 : 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginTop: 40,
    marginBottom: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: colors.secondary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: width < 400 ? 22 : 28,
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  itemContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: width < 400 ? 10 : 16,
    marginHorizontal: width < 400 ? 4 : 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankText: {
    fontSize: width < 400 ? 18 : 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginRight: 8,
  },
  usernameContainer: {
    flex: 1,
  },
  usernameText: {
    fontSize: width < 400 ? 16 : 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  pointsText: {
    fontSize: width < 400 ? 14 : 18,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LeaderboardScreen;