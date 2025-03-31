import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { RootState } from '../../features/store';
import { logout } from '../../features/authSlice';

interface FriendshipRequest {
  id: string; // Asegúrate de que el tipo sea correcto
  sender: {
    username: string;
  };
}

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { completedMissions } = useSelector((state: RootState) => state.missions);
  const entries = useSelector((state: RootState) => state.journal.entries);

  const totalPoints = completedMissions.reduce((sum, mission) => sum + mission.points, 0);
  const totalCities = Object.keys(entries).length;
  const totalEntries = Object.values(entries).flat().length;

  const [friendshipRequests, setFriendshipRequests] = useState<FriendshipRequest[]>([]); // Definimos el tipo de estado
  const [isRequestsVisible, setIsRequestsVisible] = useState(false); // Estado para controlar la visibilidad de las solicitudes

  // Función para obtener las solicitudes de amistad
  const fetchFriendshipRequests = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/friends/requests/${user?.id}`);
      setFriendshipRequests(response.data); // Guardamos las solicitudes en el estado
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
    }
  };
  const handleAcceptRequest = async (id: string) => {
    try {
      console.log("Esta es la id:" + id);
      const response = await axios.get(`http://localhost:5000/api/friends/accept-requests/${id}`);
      // Si la solicitud fue aceptada correctamente
      if (response.status === 200) {
        // Actualiza el estado de las solicitudes de amistad, eliminando la aceptada
        setFriendshipRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
        alert('Solicitud aceptada con éxito!');
      }
    } catch (error: any) {
      console.error('Error al aceptar la solicitud:', error.response ? error.response.data : error.message);
      alert('Hubo un error al aceptar la solicitud: ' + (error.response ? error.response.data.error : error.message));
    }
  };
  
  const handleRejectRequest = async (id: string) => {
    try {
      console.log("Esta es la id:" + id);
      const response = await axios.get(`http://localhost:5000/api/friends/reject-requests/${id}`);
      // Si la solicitud fue rechazada correctamente
      if (response.status === 200) {
        // Actualiza el estado de las solicitudes de amistad, eliminando la rechazada
        setFriendshipRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
        alert('Solicitud rechazada con éxito!');
      }
    } catch (error: any) {
      console.error('Error al rechazar la solicitud:', error.response ? error.response.data : error.message);
      alert('Hubo un error al rechazar la solicitud: ' + (error.response ? error.response.data.error : error.message));
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchFriendshipRequests(); // Llamamos a la función cuando el componente se monta
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const toggleRequestsVisibility = () => {
    setIsRequestsVisible(!isRequestsVisible); // Cambiar el estado de visibilidad
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={user?.profilePicture ? { uri: user.profilePicture } : require('../../assets/icons/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedMissions.length}</Text>
          <Text style={styles.statLabel}>Misiones</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCities}</Text>
          <Text style={styles.statLabel}>Ciudades</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas del Diario</Text>
        <View style={styles.journalStats}>
          <Text style={styles.journalStat}>Total de entradas: {totalEntries}</Text>
          <Text style={styles.journalStat}>Ciudades visitadas: {totalCities}</Text>
        </View>
      </View>

      {/* Menú de solicitudes de amistad */}
      <View style={styles.requestsContainer}>
        <TouchableOpacity onPress={toggleRequestsVisibility}>
          <Text style={styles.requestsTitle}>
            {isRequestsVisible ? 'Ocultar Solicitudes' : 'Ver Solicitudes'}
          </Text>
        </TouchableOpacity>

        {/* Si el estado de visibilidad es verdadero, mostramos las solicitudes */}
        {isRequestsVisible && (
          <FlatList
  data={friendshipRequests}
  keyExtractor={(item) => item.id} // Asegúrate de que id sea una cadena
  renderItem={({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestText}>
        {item.sender.username} te ha enviado una solicitud.
      </Text>
      <TouchableOpacity 
        style={styles.acceptButton} 
        onPress={() => handleAcceptRequest(item.id)} // Pasamos el id de la solicitud
      >
        <Text style={styles.acceptButtonText}>Aceptar</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.rejectButton}
        onPress={() => handleRejectRequest(item.id)} // Pasamos el id de la solicitud
      >
        <Text style={styles.rejectButtonText}>Rechazar</Text>
      </TouchableOpacity>
    </View>
  )}
/>

        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  journalStat: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  requestItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  requestText: {
    fontSize: 16,
    color: '#555',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  acceptButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  rejectButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  rejectButtonText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default ProfileScreen;
