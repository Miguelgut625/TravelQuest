import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
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
    } finally {
      setLoadingFriends(false);
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
});

export default FriendsScreen;
