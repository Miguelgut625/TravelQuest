import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Alert,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareMissionWithFriend } from '../services/missionService';
import { getFriends } from '../services/friendService';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

interface Friend {
  user2Id: string;
  username: string;
  points: number;
  profile_pic_url?: string;
}

interface ShareMissionModalProps {
  visible: boolean;
  onClose: () => void;
  mission: any; // La misión a compartir
}

const ShareMissionModal: React.FC<ShareMissionModalProps> = ({
  visible,
  onClose,
  mission
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  // Cargar lista de amigos cuando se abre el modal
  useEffect(() => {
    console.log('🔄 ShareMissionModal useEffect:', { 
      visible, 
      userId: user?.id, 
      mission: mission?.id 
    });
    
    if (visible && user?.id) {
      fetchFriends();
    } else if (visible && !user?.id) {
      console.log('⚠️ Modal visible pero no hay usuario autenticado');
      Alert.alert('Error', 'No estás autenticado');
      onClose();
    }
  }, [visible, user?.id]);

  const fetchFriends = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      console.log('🔍 Cargando lista de amigos para usuario:', user.id);
      
      const friendsData = await getFriends(user.id);
      console.log('📊 Datos brutos de getFriends:', friendsData);

      if (friendsData.length === 0) {
        console.log('❌ No se encontraron amigos');
        setFriends([]);
        return;
      }

      // Formatear los datos de amigos
      const validFriends = friendsData.map(friend => ({
        user2Id: friend.user2Id,
        username: friend.username || 'Usuario desconocido',
        points: friend.points || 0,
        profile_pic_url: friend.avatarUrl
      }));

      setFriends(validFriends);
      console.log(`✅ ${validFriends.length} amigos cargados correctamente:`, 
        validFriends.map(f => f.username));

    } catch (error) {
      console.error('❌ Error al cargar amigos:', error);
      Alert.alert('Error', 'No se pudieron cargar tus amigos');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithFriend = async (friend: Friend) => {
    if (!user?.id || !mission) return;

    setSharing(true);
    try {
      console.log('🚀 Compartiendo misión con:', friend.username);

      await shareMissionWithFriend(
        mission.id,
        user.id,
        friend.user2Id,
        mission.challenge?.title || mission.title,
        mission.cityName
      );

      Alert.alert(
        '✅ ¡Misión compartida!',
        `La misión "${mission.challenge?.title || mission.title}" ha sido compartida con ${friend.username}`,
        [
          {
            text: 'OK',
            onPress: () => onClose()
          }
        ]
      );

    } catch (error: any) {
      console.error('Error al compartir misión:', error);
      
      if (error.message?.includes('Ya compartiste')) {
        Alert.alert('⚠️ Ya compartida', `Ya compartiste esta misión con ${friend.username}`);
      } else {
        Alert.alert('Error', 'No se pudo compartir la misión. Inténtalo de nuevo.');
      }
    } finally {
      setSharing(false);
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    console.log('🎯 Renderizando amigo:', item.username);
    
    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleShareWithFriend(item)}
        disabled={sharing}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendInitial}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.username}</Text>
            <Text style={styles.friendPoints}>
              {item.points} puntos
            </Text>
          </View>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color="#999" 
        />
      </TouchableOpacity>
    );
  };

  if (!mission) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Compartir con Amigos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.missionInfo}>
            <Text style={styles.missionTitle}>
              {mission.challenge?.title || mission.title}
            </Text>
            <Text style={styles.missionCity}>
              📍 {mission.cityName}
            </Text>
            <View style={styles.missionStats}>
              <Text style={styles.stat}>
                ⭐ {mission.challenge?.difficulty || mission.difficulty}
              </Text>
              <Text style={styles.stat}>
                🎁 {mission.challenge?.points || mission.points} puntos
              </Text>
            </View>
          </View>

          <View style={styles.friendsContainer}>
            <Text style={styles.friendsTitle}>Selecciona un amigo:</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Cargando amigos...</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={50} color="#999" />
                <Text style={styles.emptyText}>No tienes amigos agregados</Text>
                <Text style={styles.emptySubtext}>
                  Agrega amigos desde la sección de Amigos
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.debugText}>
                  DEBUG: {friends.length} amigos encontrados - Loading: {loading ? 'true' : 'false'}
                </Text>
                <FlatList
                  data={friends}
                  keyExtractor={(item) => item.user2Id}
                  renderItem={renderFriendItem}
                  style={styles.friendsList}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>

          {sharing && (
            <View style={styles.sharingOverlay}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.sharingText}>Compartiendo misión...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  missionInfo: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  missionCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  missionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  friendsContainer: {
    flex: 1,
    minHeight: 200,
  },
  friendsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  friendPoints: {
    fontSize: 14,
    color: '#666',
  },
  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ShareMissionModal; 