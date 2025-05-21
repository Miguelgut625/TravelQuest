// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { countUnreadMessages } from '../../services/messageService';
import { getFriends, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest } from '../../services/friendService';
import { searchUsersByUsername } from '../../services/userService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Friend {
  user2Id: string;
  username: string;
  points: number;
  unreadMessages?: number;
  rankIndex: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  username: string;
  createdAt: string;
  type: string;
  receiverId: string;
}

const { width, height } = Dimensions.get('window');


const FriendsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [activeRequestTab, setActiveRequestTab] = useState<'received' | 'sent'>('received');
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Estados para el buscador
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Obtener amigos
      const friendsList = await getFriends(user.id);
      const friendsWithUnread = await Promise.all(
        friendsList.map(async (friend) => {
          const unreadCount = await countUnreadMessages(user.id);
          return {
            ...friend,
            unreadMessages: unreadCount || 0
          };
        })
      );
      setFriends(friendsWithUnread);

      // Obtener solicitudes de amistad
      const requests = await getFriendRequests(user.id);
      setFriendRequests(requests);

      // Obtener solicitudes pendientes enviadas
      const { data: sentRequests, error: sentError } = await supabase
        .from('friendship_invitations')
        .select('receiverId')
        .eq('senderId', user.id)
        .eq('status', 'Pending');

      if (!sentError && sentRequests) {
        setPendingRequests(new Set(sentRequests.map(req => req.receiverId)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsersByUsername(query, user?.id);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los resultados de búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!user) return;

    try {
      const { success, error } = await sendFriendRequest(user.id, userId);
      if (success) {
        Alert.alert('Éxito', 'Solicitud de amistad enviada');
        setPendingRequests(prev => new Set([...prev, userId]));
        setShowSearchResults(false);
        setSearchQuery('');
      } else {
        Alert.alert('Error', error || 'No se pudo enviar la solicitud de amistad');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la solicitud de amistad');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { success } = await acceptFriendRequest(requestId);
      if (success) {
        Alert.alert('Éxito', 'Solicitud de amistad aceptada');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { success } = await rejectFriendRequest(requestId);
      if (success) {
        Alert.alert('Éxito', 'Solicitud de amistad rechazada');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const request = friendRequests.find(r => r.id === requestId);
      if (!request || !user) return;

      const { success, error } = await cancelFriendRequest(user.id, request.receiverId);
      if (success) {
        Alert.alert('Éxito', 'Solicitud cancelada correctamente');
        fetchData();
      } else {
        Alert.alert('Error', error || 'No se pudo cancelar la solicitud');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cancelar la solicitud');
    }
  };

  const isUserFriend = (userId: string) => {
    return friends.some(friend => friend.user2Id === userId);
  };

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    return (
      <View style={styles.searchResultsContainer}>
        {isSearching ? (
          <ActivityIndicator size="small" color="#005F9E" />
        ) : searchResults.length > 0 ? (
          searchResults.map((result) => {
            const isFriend = isUserFriend(result.id);
            const hasPendingRequest = pendingRequests.has(result.id);
            return (
              <TouchableOpacity
                key={result.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setShowSearchResults(false);
                  setSearchQuery('');
                  navigation.navigate('FriendProfile', {
                    friendId: result.id,
                    friendName: result.username,
                    rankIndex: result.rankIndex
                  });
                }}
              >
                <View style={styles.searchResultContent}>
                  <View style={styles.searchResultHeader}>
                    <Text style={styles.searchResultUsername}>{result.username}</Text>
                    {isFriend && (
                      <View style={styles.friendBadge}>
                        <Text style={styles.friendBadgeText}>Amigo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.searchResultPoints}>{result.points || 0} puntos</Text>
                </View>
                {!isFriend && (
                  <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => handleSendFriendRequest(result.id)}
                  >
                    <Ionicons
                      name={hasPendingRequest ? "time-outline" : "person-add-outline"}
                      size={24}
                      color={hasPendingRequest ? "#FFA000" : "#005F9E"}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
        )}
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => navigation.navigate('FriendProfile', {
        friendId: item.user2Id,
        friendName: item.username,
        rankIndex: item.rankIndex
      })}
    >
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendPoints}>Puntos: {item.points}</Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Chat', { friendId: item.user2Id, friendName: item.username })}
        >
          {(item.unreadMessages || 0) > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{item.unreadMessages}</Text>
            </View>
          )}
          <Ionicons name="chatbubble-outline" size={24} color="#005F9E" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFriendRequests = () => {
    const receivedRequests = friendRequests.filter(request => request.type === 'received');
    const sentRequests = friendRequests.filter(request => request.type === 'sent');

    return (
      <View style={styles.requestsContainer}>
        <View style={styles.requestTabsContainer}>
          <TouchableOpacity
            style={[styles.requestTab, activeRequestTab === 'received' && styles.activeRequestTab]}
            onPress={() => setActiveRequestTab('received')}
          >
            <Text style={[styles.requestTabText, activeRequestTab === 'received' && styles.activeRequestTabText]}>
              Recibidas ({receivedRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestTab, activeRequestTab === 'sent' && styles.activeRequestTab]}
            onPress={() => setActiveRequestTab('sent')}
          >
            <Text style={[styles.requestTabText, activeRequestTab === 'sent' && styles.activeRequestTabText]}>
              Enviadas ({sentRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeRequestTab === 'received' ? (
          receivedRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tienes solicitudes recibidas</Text>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {receivedRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUsername}>{request.username}</Text>
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request.id)}
                    >
                      <Ionicons name="checkmark" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request.id)}
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          sentRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tienes solicitudes enviadas</Text>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {sentRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUsername}>{request.username}</Text>
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.cancelButton]}
                      onPress={() => handleCancelRequest(request.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size={40} color="#005F9E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Amigos</Text>
        </View>
        <View style={styles.rightSpace} />
      </View>
      <View style={styles.container}>
        <View style={styles.searchInfoRow}>
          <Ionicons name="person-add-outline" size={20} color={colors.text.light} style={{ marginRight: 6 }} />
          <Text style={styles.searchInfoText}>Busca y agrega nuevos amigos usando el buscador</Text>
        </View>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#666"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {renderSearchResults()}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friends.length}</Text>
            <Text style={styles.statLabel}>Amigos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friendRequests.length}</Text>
            <Text style={styles.statLabel}>Solicitudes</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Amigos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Solicitudes
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No tienes amigos aún. ¡Busca y agrega algunos!
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.user2Id}
              renderItem={renderFriendItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#005F9E']}
                />
              }
            />
          )
        ) : (
          renderFriendRequests()
        )}
      </View>
    </SafeAreaView>
  );
};

const colors = {
  primary: '#26547C',      // Azul oscuro (fuerte pero amigable)
  secondary: '#70C1B3',    // Verde agua (fresco y cálido)
  background: '#F1FAEE',   // Verde muy claro casi blanco (limpio y suave)
  white: '#FFFFFF',        // Blanco neutro
  text: {
    primary: '#1D3557',    // Azul muy oscuro (excelente legibilidad)
    secondary: '#52B788',  // Verde medio (agradable para texto secundario)
    light: '#A8DADC',      // Verde-azulado pastel (ligero, decorativo)
  },
  border: '#89C2D9',       // Azul claro (suave y limpio)
  success: '#06D6A0',      // Verde menta (positivo y moderno)
  error: '#FF6B6B',        // Rojo coral (alerta suave y visualmente amigable)
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: width < 400 ? 6 : 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: width < 400 ? 8 : 16,
    marginTop:10,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: width < 400 ? 20 : 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  rightSpace: {
    width: 32,
  },
  searchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: width < 400 ? 8 : 16,
  },
  searchInfoText: {
    color: colors.text.light,
    fontSize: width < 400 ? 12 : 14,
  },
  searchContainer: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: width < 400 ? 10 : 16,
    margin: width < 400 ? 8 : 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
    color: colors.text.secondary,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 10,
  },
  clearButton: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  searchResultUsername: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  friendBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  friendBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchResultPoints: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  addFriendButton: {
    marginLeft: 8,
  },
  noResultsText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: width < 400 ? 10 : 16,
    marginHorizontal: width < 400 ? 8 : 16,
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: width < 400 ? 18 : 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: width < 400 ? 12 : 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 4,
    marginHorizontal: width < 400 ? 8 : 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  activeTabText: {
    color: colors.white,
  },
  friendItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: width < 400 ? 10 : 16,
    marginHorizontal: width < 400 ? 4 : 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: width < 400 ? 14 : 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  friendPoints: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
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
  requestItem: {
    padding: width < 400 ? 10 : 15,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 18,
    fontWeight: '600',
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFA000',
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
  requestsContainer: {
    flex: 1,
  },
  requestTabsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeRequestTab: {
    backgroundColor: '#005F9E',
  },
  requestTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeRequestTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  requestsList: {
    flex: 1,
  },
});

export default FriendsScreen;