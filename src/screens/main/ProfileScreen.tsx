import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView, FlatList, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout, setAuthState } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getUserPoints } from '../../services/pointsService';

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
  sender: {
    username: string;
  };
  users: {
    username: string;
  };
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
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
  const [friendshipRequests, setFriendshipRequests] = useState<FriendshipRequest[]>([]);
  const [isRequestsVisible, setIsRequestsVisible] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchUserStats();
  }, [user?.id]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoadingStats(true);

      // Obtener los puntos actuales del usuario desde el servicio
      const userPoints = await getUserPoints(user.id);

      // Obtener los journeys del usuario con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          cityId,
          journeys_missions!inner (
            completed,
            challenges!inner (
              points
            )
          )
        `)
        .eq('userId', user.id);

      if (journeysError) throw journeysError;

      // Calcular estadísticas
      const stats = {
        completedMissions: 0,
        visitedCities: 0
      };

      (journeys as Journey[])?.forEach((journey: Journey) => {
        // Añadir la ciudad a las visitadas
        if (journey.cityId) {
          stats.visitedCities++;
        }

        // Contar misiones completadas
        journey.journeys_missions.forEach((mission: JourneyMission) => {
          if (mission.completed) {
            stats.completedMissions++;
          }
        });
      });

      setStats({
        totalPoints: userPoints, // Usamos los puntos obtenidos del servicio
        completedMissions: stats.completedMissions,
        visitedCities: stats.visitedCities
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      console.log('Iniciando proceso de cierre de sesión');

      // Primero cerramos la sesión en Supabase
      console.log('Cerrando sesión en Supabase');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error al cerrar sesión en Supabase:', signOutError);
        Alert.alert('Error', 'No se pudo cerrar la sesión en Supabase');
        return;
      }

      // Verificar que la sesión se haya cerrado correctamente
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Sesión aún activa, intentando cerrar nuevamente');
        await supabase.auth.signOut();
      }

      // Una vez que la sesión está cerrada, limpiamos el estado de Redux
      console.log('Limpiando estado de Redux');
      dispatch(logout());

      // Forzar la actualización del estado de autenticación
      dispatch(setAuthState('unauthenticated'));

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'Ocurrió un error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu contraseña actual' });
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

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Primero verificamos la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error al obtener la sesión:', sessionError);
        setMessage({ type: 'error', text: 'Error al verificar tu sesión. Por favor, intenta nuevamente.' });
        return;
      }

      if (!session) {
        // Si no hay sesión, intentamos iniciar sesión con las credenciales actuales
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword
        });

        if (signInError) {
          console.error('Error al verificar contraseña:', signInError);
          setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
          return;
        }

        if (!signInData.session) {
          setMessage({ type: 'error', text: 'No se pudo iniciar sesión. Por favor, intenta nuevamente.' });
          return;
        }

        // Ahora intentamos actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          console.error('Error al actualizar contraseña:', updateError);
          setMessage({ type: 'error', text: 'No se pudo actualizar la contraseña: ' + updateError.message });
          return;
        }

        // Limpiamos el formulario
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Tu contraseña ha sido actualizada correctamente' });

        // Cerramos el modal después de 2 segundos
        setTimeout(() => {
          setIsChangePasswordVisible(false);
          setMessage({ type: '', text: '' });
        }, 2000);

        return;
      }

      // Si hay sesión activa, verificamos la contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        console.error('Error al verificar contraseña:', signInError);
        setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
        return;
      }

      // Si la contraseña es correcta, actualizamos a la nueva
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Error al actualizar contraseña:', updateError);
        setMessage({ type: 'error', text: 'No se pudo actualizar la contraseña: ' + updateError.message });
        return;
      }

      // Limpiamos el formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Tu contraseña ha sido actualizada correctamente' });

      // Cerramos el modal después de 2 segundos
      setTimeout(() => {
        setIsChangePasswordVisible(false);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      setMessage({ type: 'error', text: 'Ocurrió un error al intentar cambiar la contraseña. Por favor, intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  // Función para alternar la visibilidad de las solicitudes
  const toggleRequestsVisibility = () => {
    setIsRequestsVisible(!isRequestsVisible);
  };

  // Función para aceptar una solicitud de amistad
  const handleAcceptRequest = async (id: string) => {
    try {
      const { data: invitation, error: invitationError } = await supabase
        .from('friendship_invitations')
        .select('senderId, receiverId')
        .eq('id', id)
        .single();

      if (invitationError) throw invitationError;

      const { senderId, receiverId } = invitation;

      const { data: updatedInvitation, error: updateError } = await supabase
        .from('friendship_invitations')
        .update({ status: 'Accepted' })
        .eq('id', id)
        .single();

      if (updateError) throw updateError;

      const { data: newFriendship, error: insertError } = await supabase
        .from('friends')
        .insert([{ user1Id: senderId, user2Id: receiverId }])
        .single();

      if (insertError) throw insertError;

      setFriendshipRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
      alert('Solicitud aceptada con éxito!');
    } catch (error: any) {
      console.error('Error al aceptar la solicitud:', error.message);
      alert('Hubo un error al aceptar la solicitud: ' + error.message);
    }
  };

  // Función para rechazar una solicitud de amistad
  const handleRejectRequest = async (id: string) => {
    try {
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('friendship_invitations')
        .update({ status: 'Rejected' })
        .eq('id', id)
        .single();

      if (updateError) throw updateError;

      setFriendshipRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
      alert('Solicitud rechazada con éxito!');
    } catch (error: any) {
      console.error('Error al rechazar la solicitud:', error.message);
      alert('Hubo un error al rechazar la solicitud: ' + error.message);
    }
  };

  // Función para enviar una solicitud de amistad
  const handleSendRequest = async () => {
    try {
      const { data: receiver, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (userError) throw userError;

      const receiverId = receiver.id;

      if (user?.id === receiverId) {
        alert('No puedes enviarte una solicitud a ti mismo');
        return;
      }

      const { data: friends, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user1Id.eq.${user?.id},user2Id.eq.${receiverId}),and(user1Id.eq.${receiverId},user2Id.eq.${user?.id})`)
        .single();

      if (friends) {
        alert('Ya son amigos');
        return;
      }

      const { data: existingRequest, error: requestError } = await supabase
        .from('friendship_invitations')
        .select('*')
        .or(`and(senderId.eq.${user?.id},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${user?.id})`)
        .eq('status', 'Pending')
        .single();

      if (existingRequest) {
        alert('Ya existe una solicitud pendiente entre estos usuarios');
        return;
      }

      const { data, error } = await supabase
        .from('friendship_invitations')
        .insert([{ senderId: user?.id, receiverId }])
        .single();

      if (error) throw error;

      alert('Solicitud enviada con éxito!');
    } catch (error: any) {
      console.error('Error al enviar la solicitud:', error.message);
      alert('Hubo un error al enviar la solicitud: ' + error.message);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
      .from('friendship_invitations')
      .select(`
        id, senderId, created_at, receiverId, status,
        users:senderId (username)
      `)
      .eq('receiverId', user?.id)
      .eq('status', 'Pending');

      if (error) throw error;
      console.log('Solicitudes pendientes obtenidas:', user?.id);

      console.log('Solicitudes pendientes obtenidas:', data);
      return data;
    } catch (error: any) {
      console.error('Error al obtener solicitudes pendientes:', error.message);
      return [];
    }
  };

  // Llamar a esta función cuando se haga clic en el botón correspondiente
  const handleFetchPendingRequests = async () => {
    // Alternar el estado de isRequestsVisible
    setIsRequestsVisible(!isRequestsVisible);

    // Solo buscar solicitudes pendientes si se van a mostrar
    if (!isRequestsVisible) {
      const requests = await fetchPendingRequests();
      setFriendshipRequests(requests);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.header}>
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.username || 'Usuario'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        {loadingStats ? (
          <ActivityIndicator size="large" color="#005F9E" />
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPoints}</Text>
              <Text style={styles.statLabel}>Puntos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completedMissions}</Text>
              <Text style={styles.statLabel}>Misiones Completadas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.visitedCities}</Text>
              <Text style={styles.statLabel}>Ciudades</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social</Text>
        <TouchableOpacity
          style={styles.settingsOption}
          onPress={() => navigation.navigate('Friends')}
        >
          <Ionicons name="people" size={24} color="#005F9E" />
          <Text style={styles.settingsText}>Amigos</Text>
          <Ionicons name="chevron-forward" size={24} color="#78909C" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsOption}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy" size={24} color="#005F9E" />
          <Text style={styles.settingsText}>Leaderboard</Text>
          <Ionicons name="chevron-forward" size={24} color="#78909C" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <TouchableOpacity
          style={styles.settingsOption}
          onPress={() => setIsChangePasswordVisible(true)}
        >
          <Ionicons name="lock-closed" size={24} color="#005F9E" />
          <Text style={styles.settingsText}>Cambiar Contraseña</Text>
          <Ionicons name="chevron-forward" size={24} color="#78909C" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solicitudes de amistad</Text>
        <TouchableOpacity
          style={styles.settingsOption}
          onPress={handleFetchPendingRequests}
        >
          <Ionicons name="person-add" size={24} color="#005F9E" />
          <Text style={styles.settingsText}>
            {isRequestsVisible ? 'Ocultar Solicitudes' : 'Ver Solicitudes'}
          </Text>
          <Ionicons name={isRequestsVisible ? "chevron-up" : "chevron-down"} size={24} color="#78909C" />
        </TouchableOpacity>

        {isRequestsVisible && (
          <View style={styles.friendsListContainer}>
            {friendshipRequests.length === 0 ? (
              <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
            ) : (
              <FlatList
                data={friendshipRequests}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.friendRequestItem}>
                    <Text style={styles.friendRequestName}>
                      {item.users.username || 'Usuario desconocido'}
                    </Text>
                    <View style={styles.friendRequestButtons}>
                      <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(item.id)}>
                        <Text style={styles.buttonText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRequest(item.id)}>
                        <Text style={styles.buttonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}
        
        <View style={styles.sendRequestContainer}>
          <TextInput
            style={styles.emailInput}
            placeholder="Nombre de usuario"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendRequest}>
            <Text style={styles.buttonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
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
        transparent={true}
        animationType="slide"
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>

            {message.text ? (
              <Text style={[styles.messageText, message.type === 'error' ? styles.errorText : styles.successText]}>
                {message.text}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Contraseña actual"
              secureTextEntry
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar nueva contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setIsChangePasswordVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setMessage({ type: '', text: '' });
              }}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
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
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingsText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
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
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#005F9E',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#005F9E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#78909C',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 10,
  },
  successText: {
    color: '#005F9E',
    marginBottom: 10,
  },
  friendsListContainer: {
    marginTop: 5,
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  friendRequestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
  },
  friendRequestName: {
    fontSize: 16,
    flex: 1,
  },
  friendRequestButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#005F9E',
    padding: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  rejectButton: {
    backgroundColor: '#D32F2F',
    padding: 8,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sendRequestContainer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emailInput: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#005F9E',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
  }
});

export default ProfileScreen; 