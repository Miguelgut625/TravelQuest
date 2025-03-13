import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Mission } from '../../features/missionSlice';

const MissionCard = ({ mission }: { mission: Mission }) => (
  <TouchableOpacity style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{mission.title}</Text>
      <Text style={[styles.badge, { backgroundColor: mission.completed ? '#4CAF50' : '#FFA000' }]}>
        {mission.completed ? 'Completada' : 'Pendiente'}
      </Text>
    </View>
    <Text style={styles.cardDescription}>{mission.description}</Text>
    <View style={styles.cardFooter}>
      <Text style={styles.difficulty}>Dificultad: {mission.difficulty}</Text>
      <Text style={styles.points}>{mission.points} puntos</Text>
    </View>
  </TouchableOpacity>
);

const MissionsScreen = ({ route }) => {
  const { missions = [] } = route.params || {}; // Asegúrate de que missions sea un array vacío si no hay misiones

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tus Misiones</Text>
      {missions.length === 0 ? (
        <Text>No hay misiones disponibles.</Text> // Mensaje si no hay misiones
      ) : (
        <FlatList
          data={missions}
          renderItem={({ item }) => <MissionCard mission={item} />}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  tabs: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDescription: {
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficulty: {
    color: '#666',
    fontSize: 12,
  },
  points: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default MissionsScreen; 