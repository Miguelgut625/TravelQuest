// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { getRecentConversations } from '../../services/messageService';
import { supabase } from '../../services/supabase';

interface Conversation {
  conversation_user_id: string;
  username: string;
  last_message: string;
  created_at: string;
  unread_count: number;
}

const ConversationsScreen = () => {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    // Verificar si el usuario está autenticado
    if (!user) {
      Alert.alert(
        "No autenticado",
        "Por favor inicia sesión para acceder a los mensajes",
        [
          { text: "OK", onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          })}
        ]
      );
      return;
    }

    // Verificar si el correo electrónico está verificado
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error obteniendo información del usuario:', error);
      return;
    }

    if (data && data.user && !data.user.email_confirmed_at) {
      Alert.alert(
        "Correo no verificado",
        "Por favor verifica tu correo electrónico para acceder a los mensajes. Revisa tu bandeja de entrada.",
        [
          { text: "OK", onPress: () => navigation.navigate('VerifyEmail', { email: data.user?.email }) }
        ]
      );
      return;
    }

    // Si todo está bien, cargamos las conversaciones
    fetchConversations();
  };

  const fetchConversations = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const conversationsData = await getRecentConversations(user.id);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const openChat = (friendId: string, friendName: string) => {
    // @ts-ignore
    navigation.navigate('Chat', { friendId, friendName });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#F5D90A" />
      </View>
    );
  }

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    // Formatear la fecha para mostrar
    const messageDate = new Date(item.created_at);
    const now = new Date();
    
    // Si es hoy, mostrar la hora
    const formattedDate = messageDate.toDateString() === now.toDateString()
      ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : messageDate.toLocaleDateString();

    // Avatar placeholder seguro cuando no hay username
    const avatarLetter = item.username && item.username.length > 0 
      ? item.username.charAt(0).toUpperCase() 
      : '?';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChat(item.conversation_user_id, item.username )}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {avatarLetter}
          </Text>
        </View>
        
        <View style={styles.messageInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.username}>{item.username }</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
          </View>
          
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                item.unread_count > 0 ? styles.unreadMessage : null
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.last_message || 'No hay mensajes'}
            </Text>
            
            {item.unread_count > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRowCustom}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="arrow-back" size={28} color="#7F5AF0" />
        </TouchableOpacity>
        <Text style={styles.title}>Mensajes</Text>
      </View>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={60} color="#7F5AF0" />
          <Text style={styles.emptyText}>
            No tienes conversaciones aún.
          </Text>
          <Text style={styles.emptySubtext}>
            Ve a la pantalla de amigos para iniciar un chat.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.conversation_user_id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F5D90A']}
            />
          }
          contentContainerStyle={{ paddingVertical: 10 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    paddingTop: 56,
  },
  headerRowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5D90A',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0A0A0',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#2D2F3A',
    borderBottomWidth: 1,
    borderBottomColor: '#181A20',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7F5AF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: '#F5D90A',
  },
  timestamp: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#A0A0A0',
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    color: '#F5D90A',
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#7F5AF0',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ConversationsScreen; 