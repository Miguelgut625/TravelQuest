import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { countUnreadMessages } from '../../services/messageService';

interface Friend {
  user2Id: string;
  username: string;
  points: number;
  unreadMessages?: number;
}

const FriendsScreen = () => {
  const navigation = useNavigation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  const fetchFriends = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data: friendData, error: friendError } = await supabase
        .from('friends')
        .select('user2Id')
        .eq('user1Id', user.id);

      if (friendError) throw friendError;

      // Obtener detalles de cada amigo
      const friendsDetails = await Promise.all(
        friendData.map(async (friend: { user2Id: string }) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, points')
            .eq('id', friend.user2Id)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            return null;
          }

          // Contar mensajes no leídos
          const unreadCount = await countUnreadMessages(user.id);

          return {
            user2Id: friend.user2Id,
            username: userData.username,
            points: userData.points,
            unreadMessages: unreadCount || 0
          };
        })
      );

      // Filtrar los amigos que no se pudieron obtener
      setFriends(friendsDetails.filter((friend) => friend !== null));
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  // Función para manejar el refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  // Abrir la pantalla de chat con un amigo
  const openChat = (friendId: string, friendName: string) => {
    // @ts-ignore - Ignoramos el error de tipado ya que estamos usando 'as never'
    navigation.navigate('Chat', { friendId, friendName });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Renderizar cada item del amigo
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity 
      style={styles.friendItem}
      onPress={() => openChat(item.user2Id, item.username)}
    >
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendPoints}>Puntos: {item.points}</Text>
      </View>
      <View style={styles.chatIconContainer}>
        {(item.unreadMessages || 0) > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.unreadMessages}</Text>
          </View>
        )}
        <Ionicons name="chatbubble-outline" size={24} color="#4CAF50" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Amigos</Text>
      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tienes amigos aún. ¡Agrega algunos desde la pantalla de perfil!
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.user2Id.toString()}
          renderItem={renderFriendItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  friendItem: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
  },
  friendPoints: {
    fontSize: 16,
    color: '#666',
  },
  chatIconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FriendsScreen;
