// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout, setAuthState } from '../../features/auth/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';

// Definir interfaces para los tipos de datos
interface Journey {
  id: string;
  cityId: string;
  journeys_missions: JourneyMission[];
}

interface JourneyMission {
  completed: boolean;
  challenges: {
    points: number;
  };
}

interface FriendshipRequest {
  id: string;
  users: {
    username: string;
  };
}

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    visitedCities: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [friendshipRequests, setFriendshipRequests] = useState([]);
  const [isRequestsVisible, setIsRequestsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(0);

  useEffect(() => {
    fetchUserStats();
  }, [user?.id]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoadingStats(true);
      console.log('Obteniendo estadísticas...');

      // Obtener los puntos del usuario
      const { data: userPointsData, error: userPointsError } = await supabase
        .from('users')
        .select('points, level, xp')
        .eq('id', user.id)
        .single();

      if (userPointsError) throw userPointsError;

      // Obtener los journeys del usuario con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`id, cityId, journeys_missions!inner (completed, challenges!inner (points))`)
        .eq('userId', user.id);

      if (journeysError) {
        console.error('Error al obtener journeys:', journeysError);
        throw journeysError;
      }

      // Calcular estadísticas
      let completedMissions = 0;
      const visitedCities = new Set();

      if (journeys && journeys.length > 0) {
        journeys.forEach((journey) => {
          // Añadir la ciudad al Set de ciudades visitadas
          if (journey.cityId) {
            visitedCities.add(journey.cityId);
          }

          if (journey.journeys_missions && journey.journeys_missions.length > 0) {
            journey.journeys_missions.forEach((mission) => {
              if (mission.completed) {
                completedMissions++;
              }
            });
          }
        });
      }

      setStats({
        totalPoints: userPointsData?.points || 0,
        completedMissions,
        visitedCities: visitedCities.size
      });

      // Actualizar nivel y XP
      setLevel(userPointsData?.level || 0);
      setXp(userPointsData?.xp || 0);
      setXpNext(calculateNextLevelXP(userPointsData?.level || 0));

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateNextLevelXP = (currentLevel) => {
    // Fórmula simple para calcular XP del siguiente nivel
    return (currentLevel + 1) * 100;
  };

  const handleLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      console.log('Iniciando proceso de cierre de sesión');

      // Cerramos la sesión en Supabase
      console.log('Cerrando sesión en Supabase');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error al cerrar sesión en Supabase:', signOutError);
        Alert.alert('Error', 'No se pudo cerrar la sesión en Supabase');
        return;
      }

      // Limpiamos el estado de Redux
      console.log('Limpiando estado de Redux');
      dispatch(logout());
      dispatch(setAuthState('unauthenticated'));

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'Ocurrió un error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Primero verificamos la contraseña actual usando el inicio de sesión
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
        return;
      }

      // Cambiar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Actualizar la contraseña en la tabla de usuarios
      const { error: updateDbError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateDbError) {
        console.warn('No se pudo actualizar la contraseña en la base de datos:', updateDbError);
      }

      setMessage({ type: 'success', text: 'Contraseña actualizada con éxito' });
      
      // Limpiar campos y cerrar modal después de un breve retraso
      setTimeout(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangePasswordVisible(false);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setMessage({ type: 'error', text: 'Error al cambiar la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const toggleRequestsVisibility = () => {
    setIsRequestsVisible(!isRequestsVisible);
    if (!isRequestsVisible) {
      handleFetchPendingRequests();
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friendship_invitations')
        .select(`
          id,
          users!friendship_invitations_senderId_fkey (username)
        `)
        .eq('receiverId', user.id)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes de amistad:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes de amistad');
      return [];
    }
  };

  const handleFetchPendingRequests = async () => {
    setLoading(true);
    const requests = await fetchPendingRequests();
    setFriendshipRequests(requests);
    setLoading(false);
  };

  const handleAcceptRequest = async (id) => {
    try {
      setLoading(true);

      // Actualizar el estado de la invitación a 'accepted'
      const { error: updateError } = await supabase
        .from('friendship_invitations')
        .update({ status: 'accepted' })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Obtener los detalles de la invitación
      const { data, error: fetchError } = await supabase
        .from('friendship_invitations')
        .select('senderId, receiverId')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Crear la amistad en la tabla de amistades
      const { error: insertError } = await supabase
        .from('friendships')
        .insert([
          { user1_id: data.senderId, user2_id: data.receiverId },
          { user1_id: data.receiverId, user2_id: data.senderId }
        ]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Éxito', 'Solicitud de amistad aceptada');
      
      // Refrescar la lista de solicitudes
      await handleFetchPendingRequests();

    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      setLoading(true);

      // Actualizar el estado de la invitación a 'rejected'
      const { error } = await supabase
        .from('friendship_invitations')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      Alert.alert('Éxito', 'Solicitud de amistad rechazada');
      
      // Refrescar la lista de solicitudes
      await handleFetchPendingRequests();

    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!username) {
      Alert.alert('Error', 'Por favor ingresa un nombre de usuario');
      return;
    }

    try {
      setLoading(true);

      // Buscar al usuario por nombre de usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (userError) {
        Alert.alert('Error', 'No se encontró un usuario con ese nombre');
        return;
      }

      if (userData.id === user.id) {
        Alert.alert('Error', 'No puedes enviarte una solicitud a ti mismo');
        return;
      }

      // Verificar si ya existe una amistad
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user1_id', user.id)
        .eq('user2_id', userData.id);

      if (!friendshipError && existingFriendship && existingFriendship.length > 0) {
        Alert.alert('Información', 'Ya eres amigo de este usuario');
        return;
      }

      // Verificar si ya existe una solicitud pendiente
      const { data: existingRequest, error: requestError } = await supabase
        .from('friendship_invitations')
        .select('id, status')
        .eq('senderId', user.id)
        .eq('receiverId', userData.id);

      if (!requestError && existingRequest && existingRequest.length > 0) {
        Alert.alert('Información', 'Ya has enviado una solicitud a este usuario');
        return;
      }

      // Enviar la solicitud
      const { error: insertError } = await supabase
        .from('friendship_invitations')
        .insert({
          senderId: user.id,
          receiverId: userData.id,
          status: 'pending'
        });

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Éxito', 'Solicitud de amistad enviada');
      setUsername('');

    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.username || 'Usuario'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.levelContainer}>
              <Text style={styles.levelText}>Nivel {level}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progress, { width: `${(xp / xpNext) * 100}%` }]} />
              </View>
              <Text style={styles.xpText}>{xp}/{xpNext} XP</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        {loadingStats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size={40} color="#005F9E" />
          </View>
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPoints}</Text>
              <Text style={styles.statLabel}>Puntos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completedMissions}</Text>
              <Text style={styles.statLabel}>Misiones</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.visitedCities}</Text>
              <Text style={styles.statLabel}>Ciudades</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amigos</Text>
        <View style={styles.infoCard}>
          <TextInput
            style={styles.input}
            placeholder="Buscar usuario por nombre"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity
            style={styles.sendRequestButton}
            onPress={handleSendRequest}
            disabled={loading}
          >
            <Text style={styles.sendRequestButtonText}>Enviar solicitud</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.infoCard}
          onPress={toggleRequestsVisibility}
        >
          <View style={styles.requestsHeader}>
            <Text style={styles.requestsTitle}>Solicitudes de amistad</Text>
            <Ionicons name={isRequestsVisible ? "chevron-up" : "chevron-down"} size={24} color="#005F9E" />
          </View>

          {isRequestsVisible && (
            <View style={styles.requestsList}>
              {loading ? (
                <ActivityIndicator size="small" color="#005F9E" style={{ marginVertical: 10 }} />
              ) : friendshipRequests.length === 0 ? (
                <Text style={styles.emptyText}>No tienes solicitudes pendientes</Text>
              ) : (
                friendshipRequests.map((request) => (
                  <View key={request.id} style={styles.requestItem}>
                    <Text style={styles.requestUsername}>{request.users.username}</Text>
                    <View style={styles.requestButtons}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.acceptButton]}
                        onPress={() => handleAcceptRequest(request.id)}
                      >
                        <Text style={styles.requestButtonText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.rejectButton]}
                        onPress={() => handleRejectRequest(request.id)}
                      >
                        <Text style={styles.requestButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => setIsChangePasswordVisible(true)}
        >
          <Text style={styles.optionText}>Cambiar contraseña</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loading}
      >
        <Text style={styles.logoutButtonText}>
          {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isChangePasswordVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            
            {message.text ? (
              <Text style={[styles.messageText, message.type === 'error' ? styles.errorText : styles.successText]}>
                {message.text}
              </Text>
            ) : null}
            
            <TextInput
              style={styles.modalInput}
              placeholder="Contraseña actual"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirmar nueva contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsChangePasswordVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setMessage({ type: '', text: '' });
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Cambiar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBackground: {
    backgroundColor: '#005F9E',
    padding: 20,
    paddingBottom: 70,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFB74D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  levelContainer: {
    marginTop: 5,
  },
  levelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 5,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFB74D',
  },
  xpText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -40,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#005F9E',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#005F9E',
  },
  modalInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  confirmButton: {
    backgroundColor: '#005F9E',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageText: {
    marginBottom: 15,
    textAlign: 'center',
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  errorText: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  successText: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  sendRequestButton: {
    backgroundColor: '#005F9E',
    padding: 10,
    borderRadius: 5,
  },
  sendRequestButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  requestsList: {
    width: '100%',
    marginTop: 15,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestUsername: {
    fontSize: 16,
    color: '#333',
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 10,
  },
});

export default ProfileScreen; 