import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, [user?.id]);

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

      // Obtener los datos del usuario (puntos, nivel, xp)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points, level, xp, xp_next')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

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
        totalPoints: userData?.points || 0,
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
              }
            });
          }
        });
      }

      console.log('Estadísticas calculadas:', stats);

      // Actualizar nivel y XP
      setLevel(userData?.level || 0);
      setXp(userData?.xp || 0);
      setXpNext(userData?.xp_next || 100);

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

  const searchFriends = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error buscando amigos:', error);
      Alert.alert('Error', 'No se pudo buscar amigos');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchFriendRequests = async () => {
    if (!user?.id) return;
    
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          status,
          created_at,
          users:sender_id (
            id,
            username,
            email
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
      Alert.alert('Error', 'No se pudieron obtener las solicitudes');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      
      // Actualizar la lista de solicitudes
      await fetchFriendRequests();
    } catch (error) {
      console.error('Error procesando solicitud:', error);
      Alert.alert('Error', 'No se pudo procesar la solicitud');
    }
  };

  useEffect(() => {
    fetchFriendRequests();
  }, [user?.id]);

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

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchFriends}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchFriends}
              disabled={isSearching}
            >
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {isSearching ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            searchResults.map((result) => (
              <View key={result.id} style={styles.searchResult}>
                <Text style={styles.searchResultText}>{result.username}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {/* Implementar envío de solicitud */}}
                >
                  <Ionicons name="person-add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.sectionSubtitle}>Solicitudes Pendientes</Text>
          {isLoadingRequests ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            friendRequests.map((request) => (
              <View key={request.id} style={styles.requestItem}>
                <Text style={styles.requestText}>
                  {request.users?.username} quiere ser tu amigo
                </Text>
                <View style={styles.requestButtons}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleFriendRequest(request.id, 'accept')}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => handleFriendRequest(request.id, 'reject')}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
    width: '100%',
  },
  searchResultText: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 5,
    borderRadius: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
    width: '100%',
  },
  requestText: {
    fontSize: 16,
    flex: 1,
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    padding: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
});

export default ProfileScreen; 