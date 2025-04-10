import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from '../../services/NotificationService';

interface FriendshipRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  users: {
    username: string;
  };
}

interface Friend {
  id: string;
  username: string;
  points: number;
}

interface FriendshipData {
  user1Id: string;
  user2Id: string;
  user1: {
    id: string;
    username: string;
    points: number;
  };
  user2: {
    id: string;
    username: string;
    points: number;
  };
}

const FriendsScreen = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [friendshipRequests, setFriendshipRequests] = useState<FriendshipRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
    fetchFriends();
  }, [user?.id]);

  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const { data, error } = await supabase
        .from('friends')
        .select(`
          user1Id,
          user2Id,
          user1:user1Id (id, username, points),
          user2:user2Id (id, username, points)
        `)
        .or(`user1Id.eq.${user?.id},user2Id.eq.${user?.id}`);

      if (error) throw error;

      // Usar un Set para eliminar duplicados basados en el ID del amigo
      const uniqueFriends = new Set();
      const friendsList = data?.reduce((acc: Friend[], friendship: FriendshipData) => {
        const friend = friendship.user1Id === user?.id ? friendship.user2 : friendship.user1;
        if (!uniqueFriends.has(friend.id)) {
          uniqueFriends.add(friend.id);
          acc.push({
            id: friend.id,
            username: friend.username,
            points: friend.points
          });
        }
        return acc;
      }, []) || [];

      setFriends(friendsList);
    } catch (error: any) {
      console.error('Error al obtener amigos:', error.message);
      Alert.alert('Error', 'No se pudieron cargar los amigos');
    } finally {
      setLoadingFriends(false);
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
      setFriendshipRequests(data || []);
    } catch (error: any) {
      console.error('Error al obtener solicitudes pendientes:', error.message);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes de amistad');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      // Primero obtenemos los detalles de la invitación
      const { data: invitation, error: invitationError } = await supabase
        .from('friendship_invitations')
        .select('senderId, receiverId')
        .eq('id', id)
        .single();

      if (invitationError) throw invitationError;

      // Insertamos la amistad (el trigger se encargará de la relación recíproca)
      const { error: insertError } = await supabase
        .from('friends')
        .insert([{
          user1Id: invitation.senderId,
          user2Id: invitation.receiverId,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // Actualizamos el estado de la invitación
      const { error: updateError } = await supabase
        .from('friendship_invitations')
        .update({ status: 'Accepted' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Actualizamos la UI
      setFriendshipRequests((prevRequests) =>
        prevRequests.filter(request => request.id !== id)
      );

      // Actualizamos la lista de amigos
      fetchFriends();

      Alert.alert('Éxito', 'Solicitud aceptada con éxito');
    } catch (error: any) {
      console.error('Error al aceptar la solicitud:', error.message);
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('friendship_invitations')
        .update({ status: 'Rejected' })
        .eq('id', id);

      if (updateError) throw updateError;

      setFriendshipRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
      Alert.alert('Éxito', 'Solicitud rechazada con éxito');
    } catch (error: any) {
      console.error('Error al rechazar la solicitud:', error.message);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const handleSendRequest = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre de usuario');
      return;
    }

    setLoading(true);
    try {
      // Buscar todos los usuarios con ese nombre
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username);

      if (userError) throw userError;

      if (!users || users.length === 0) {
        Alert.alert('Error', 'No se encontró ningún usuario con ese nombre');
        setLoading(false);
        return;
      }

      if (users.length > 1) {
        Alert.alert('Error', 'Hay múltiples usuarios con ese nombre. Por favor, contacta al administrador para obtener el ID único del usuario.');
        setLoading(false);
        return;
      }

      const receiverId = users[0].id;

      if (user?.id === receiverId) {
        Alert.alert('Error', 'No puedes enviarte una solicitud a ti mismo');
        setLoading(false);
        return;
      }

      // Verificar si ya son amigos (en cualquier dirección)
      const { data: existingFriendships, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`user1Id.eq.${user?.id},user2Id.eq.${user?.id}`)
        .filter('user1Id', 'in', `(${user?.id},${receiverId})`)
        .filter('user2Id', 'in', `(${user?.id},${receiverId})`);

      if (friendsError) throw friendsError;

      if (existingFriendships && existingFriendships.length > 0) {
        Alert.alert('Error', 'Ya son amigos');
        setLoading(false);
        return;
      }

      // Verificar si ya existe una solicitud pendiente
      const { data: existingRequests, error: requestError } = await supabase
        .from('friendship_invitations')
        .select('*')
        .eq('status', 'Pending')
        .or(`and(senderId.eq.${user?.id},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${user?.id})`);

      if (requestError) throw requestError;

      if (existingRequests && existingRequests.length > 0) {
        Alert.alert('Error', 'Ya existe una solicitud pendiente entre estos usuarios');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('friendship_invitations')
        .insert([{ senderId: user?.id, receiverId }]);

      if (error) throw error;

      // Enviar notificación al receptor
      await NotificationService.getInstance().notifyFriendRequest(receiverId, user?.username || 'Alguien');

      Alert.alert('Éxito', 'Solicitud enviada con éxito');
      setUsername('');
    } catch (error: any) {
      console.error('Error al enviar la solicitud:', error.message);
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sendRequestContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          value={username}
          onChangeText={setUsername}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabledButton]}
          onPress={handleSendRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar Solicitud</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis Amigos</Text>
        {loadingFriends ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : friends.length === 0 ? (
          <Text style={styles.noFriendsText}>No tienes amigos aún</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendUsername}>{item.username}</Text>
                  <Text style={styles.friendPoints}>{item.points} puntos</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solicitudes Pendientes</Text>
        {friendshipRequests.length === 0 ? (
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
                <View style={styles.requestButtons}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(item.id)}
                  >
                    <Text style={styles.requestButtonText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(item.id)}
                  >
                    <Text style={styles.requestButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  sendRequestContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
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
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  friendPoints: {
    fontSize: 14,
    color: '#666',
  },
  noFriendsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  requestItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  requestButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noRequestsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
});

export default FriendsScreen;
