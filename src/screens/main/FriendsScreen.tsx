import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase'; 
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

interface Friend {
  user2Id: string; 
  username: string; 
  points: number; 
}

const FriendsScreen = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user); // Obtener el usuario completo

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) {
        setLoading(false);
        return; // Si no hay usuario, no hacemos nada
      }

      try {
        setLoading(true);
        const { data: friendData, error: friendError } = await supabase
          .from('friends')
          .select('user2Id')
          .eq('user1Id', user.id); // Usar el ID del usuario

        if (friendError) throw friendError;

        // Obtener detalles de cada amigo
        const friendsDetails = await Promise.all(
          friendData.map(async (friend: { user2Id: string }) => { // Definir el tipo de friend
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('username, points')
              .eq('id', friend.user2Id) 
              .single();

            if (userError) {
              console.error('Error fetching user data:', userError);
              return null; // Manejar el error
            }

            return {
              user2Id: friend.user2Id,
              username: userData.username,
              points: userData.points,
            };
          })
        );

        // Filtrar los amigos que no se pudieron obtener
        setFriends(friendsDetails.filter((friend) => friend !== null));
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Amigos</Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.user2Id.toString()} 
        renderItem={({ item }) => (
          <View style={styles.friendItem}>
            <Text style={styles.friendName}>{item.username}</Text>
            <Text style={styles.friendPoints}>Puntos: {item.points}</Text>
          </View>
        )}
      />
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
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
  },
  friendPoints: {
    fontSize: 16,
    color: '#666', 
  },
});

export default FriendsScreen;
