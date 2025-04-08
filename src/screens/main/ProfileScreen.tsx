import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView, FlatList, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout, setAuthState } from '../../features/authSlice';
import { supabase, ensureValidSession } from '../../services/supabase';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

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
  const [level, setLevel] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(0);

  useEffect(() => {
    fetchUserStats();
    
    // Verificar sesión válida para las suscripciones
    const setupRealtime = async () => {
      try {
        const { valid, session, error } = await ensureValidSession();
        if (!valid) {
          console.error('Sesión inválida para suscripciones en tiempo real:', error);
          Alert.alert('Error de sesión', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          dispatch(logout());
          return;
        }
        
        // Suscripción a cambios en journeys del usuario
        const journeysSubscription = supabase
          .channel('journeys-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'journeys',
              filter: `userId=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en journeys:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en las misiones del usuario
        const missionsSubscription = supabase
          .channel('journeys-missions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'journeys_missions'
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en misiones:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en challenges
        const challengesSubscription = supabase
          .channel('challenges-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'challenges'
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en challenges:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en el usuario (nivel, xp)
        const userStatsSubscription = supabase
          .channel('user-stats-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en stats de usuario:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en solicitudes de amistad
        const friendshipSubscription = supabase
          .channel('friendship-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'friendship_invitations',
              filter: `receiverId=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en solicitudes de amistad:', payload);
              if (isRequestsVisible) {
                fetchPendingRequests().then(requests => setFriendshipRequests(requests));
              }
            }
          )
          .subscribe();
        
        // Limpieza de suscripciones
        return () => {
          console.log('Limpiando suscripciones de tiempo real');
          journeysSubscription.unsubscribe();
          missionsSubscription.unsubscribe();
          challengesSubscription.unsubscribe();
          userStatsSubscription.unsubscribe();
          friendshipSubscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error configurando suscripciones en tiempo real:', error);
      }
    };
    
    const cleanupFn = setupRealtime();
    
    return () => {
      if (cleanupFn && typeof cleanupFn.then === 'function') {
        cleanupFn.then(cleanup => {
          if (cleanup && typeof cleanup === 'function') {
            cleanup();
          }
        });
      }
    };
  }, [user?.id, isRequestsVisible, dispatch]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      // Verificar sesión válida antes de obtener estadísticas
      const { valid, error: sessionError } = await ensureValidSession();
      if (!valid) {
        console.error('Sesión inválida para obtener estadísticas:', sessionError);
        Alert.alert('Error de sesión', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        dispatch(logout());
        return;
      }
      
      setLoadingStats(true);
      console.log('Obteniendo estadísticas actualizadas...');

      // Obtener los puntos del usuario
      const { data: userPointsData, error: userPointsError } = await supabase
        .from('users')
        .select('points')
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

      console.log('Journeys obtenidos:', journeys);

      // Calcular estadísticas
      const stats = {
        totalPoints: userPointsData?.points || 0,
        completedMissions: 0,
        visitedCities: new Set<string>()
      };

      if (journeys && journeys.length > 0) {
        (journeys as Journey[]).forEach((journey: Journey) => {
          // Añadir la ciudad al Set de ciudades visitadas
          if (journey.cityId) {
            stats.visitedCities.add(journey.cityId);
          }

          if (journey.journeys_missions && journey.journeys_missions.length > 0) {
            journey.journeys_missions.forEach((mission: JourneyMission) => {
              if (mission.completed) {
                stats.completedMissions++;
                stats.totalPoints += mission.challenges.points || 0;
              }
            });
          }
        });
      }

      console.log('Estadísticas calculadas:', stats);

      // Obtener el nivel, xp y xp_next del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('level, xp, xp_next')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError);
        throw userError;
      }

      console.log('Datos de usuario obtenidos:', userData);

      setLevel(userData.level || 0);
      setXp(userData.xp || 0);
      setXpNext(userData.xp_next || 100);

      setStats({
        totalPoints: stats.totalPoints,
        completedMissions: stats.completedMissions,
        visitedCities: stats.visitedCities.size
      });

      console.log('Estadísticas actualizadas correctamente');

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
        }, 2000)

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

      if (userError) {
        alert('No se encontró el usuario');
        return;
      }

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
      <View style={styles.header}>
        {user?.profilePicture ? (
          <Image
            source={{ uri: user.profilePicture }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={100} color="white" />
          </View>
        )}
        <Text style={styles.username}>{user?.username || user?.email}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        {loadingStats ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalPoints}</Text>
              <Text style={styles.statLabel}>Puntos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completedMissions}</Text>
              <Text style={styles.statLabel}>Misiones Completadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.visitedCities}</Text>
              <Text style={styles.statLabel}>Ciudades</Text>
            </View>
          </>
        )}
      </View>

      {/* Nueva sección para el nivel y la XP */}
      <View style={styles.levelContainer}>
        <Text style={styles.levelTitle}>Nivel: {level}</Text>
        <Text style={styles.xpTitle}>XP: {xp} / {xpNext}</Text>
        <View style={styles.progressBar}>
          <View style={{ width: `${(xp / xpNext) * 100}%`, backgroundColor: '#4CAF50', height: '100%' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social</Text>
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => navigation.navigate('Friends')}
          >
            <Ionicons name="people" size={24} color="white" />
            <Text style={styles.socialButtonText}>Amigos</Text>
          </TouchableOpacity>
          <Text style={styles.socialDescription}>Conéctate con tus amigos</Text>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Ionicons name="trophy" size={24} color="white" />
            <Text style={styles.socialButtonText}>Leaderboard</Text>
          </TouchableOpacity>
          <Text style={styles.socialDescription}>Mira el ranking de puntos</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <View style={styles.privacyContainer}>
          <TouchableOpacity
            style={styles.privacyButton}
            onPress={() => setIsChangePasswordVisible(true)}
          >
            <Text style={styles.privacyButtonText}>Cambiar Contraseña</Text>
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Actualiza tu contraseña para mantener tu cuenta segura
          </Text>
        </View>
      </View>

      <View style={styles.requestsContainer}>
        <TouchableOpacity onPress={handleFetchPendingRequests}>
          <Text style={styles.requestsTitle}>
            {isRequestsVisible ? 'Ocultar Solicitudes' : 'Ver Solicitudes'}
          </Text>
        </TouchableOpacity>

        {isRequestsVisible && (
          friendshipRequests.length === 0 ? (
            <Text style={styles.noRequestsText}>No hay solicitudes pendientes</Text>
          ) : (
            <FlatList
              data={friendshipRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.requestItem}>
                  <Text style={styles.requestText}>
                    {item.users.username || 'Usuario desconocido'} te ha enviado una solicitud.
                  </Text>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(item.id)}>
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRequest(item.id)}>
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )
        )}
      </View>

      <View style={styles.sendRequestContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          value={username}
          onChangeText={setUsername}
        />
        <Button title="Enviar Solicitud" onPress={handleSendRequest} />
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, loading && styles.disabledButton]}
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>

            {message.text ? (
              <Text style={[styles.messageText, message.type === 'error' ? styles.errorMessage : styles.successMessage]}>
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
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && styles.disabledButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Text>
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
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  socialContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  socialButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  socialDescription: {
    fontSize: 12,
    color: 'black',
    textAlign: 'center',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  successMessage: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  disabledButton: {
    opacity: 0.7,
  },
  privacyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    padding: 15,
  },
  privacyButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  requestsContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestText: {
    flex: 1,
    color: '#333',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    padding: 5,
    marginLeft: 10,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#f44336',
    borderRadius: 5,
    padding: 5,
    marginLeft: 10,
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendRequestContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  noRequestsText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
    width: '100%',
  },
  levelContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  xpTitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default ProfileScreen; 