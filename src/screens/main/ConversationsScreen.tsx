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
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { getRecentConversations } from '../../services/messageService';
import { supabase } from '../../services/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

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
  const { colors, isDarkMode } = useTheme();
  const styles = getConversationStyles(colors, isDarkMode);

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
          {
            text: "OK", onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }]
            })
          }
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={40} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const messageDate = new Date(item.created_at);
    const now = new Date();

    const formattedDate = messageDate.toDateString() === now.toDateString()
      ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : messageDate.toLocaleDateString();

    const avatarLetter = item.username && item.username.length > 0
      ? item.username.charAt(0).toUpperCase()
      : '?';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChat(item.conversation_user_id, item.username)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {avatarLetter}
          </Text>
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                item.unread_count > 0 && styles.unreadMessage
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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <TouchableOpacity
            style={styles.groupsButton}
            onPress={() => navigation.navigate('Groups')}
          >
            <Ionicons name="people-circle" size={26} color={isDarkMode ? '#222' : colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={60} color={colors.secondary} />
          <Text style={styles.emptyText}>
            No tienes conversaciones aún
          </Text>
          <Text style={styles.emptySubtext}>
            Ve a la pantalla de amigos para iniciar un chat
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
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

function getConversationStyles(colors, isDarkMode) {
  const { width } = Dimensions.get('window');
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerSafeArea: {
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      zIndex: 10,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
      marginTop: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      textAlign: 'center',
      flex: 1,
    },
    groupsButton: {
      backgroundColor: isDarkMode ? colors.accent : 'transparent',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: 'transparent',
      elevation: 0,
      position: 'absolute',
      right: 16,
      zIndex: 1,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    conversationItem: {
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 12,
      padding: width < 400 ? 10 : 16,
      marginHorizontal: width < 400 ? 4 : 8,
      marginVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: width < 400 ? 40 : 50,
      height: width < 400 ? 40 : 50,
      borderRadius: 25,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: isDarkMode ? '#222' : colors.surface,
      fontSize: width < 400 ? 16 : 20,
      fontWeight: 'bold',
    },
    conversationInfo: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    username: {
      fontSize: width < 400 ? 14 : 16,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : colors.text.primary,
    },
    lastMessage: {
      fontSize: width < 400 ? 12 : 14,
      color: isDarkMode ? colors.text.light : colors.text.secondary,
      flex: 1,
      marginRight: 8,
    },
    timestamp: {
      fontSize: 12,
      color: isDarkMode ? colors.text.light : colors.text.light,
    },
    messageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    unreadMessage: {
      color: isDarkMode ? colors.accent : colors.primary,
      fontWeight: '500',
    },
    badgeContainer: {
      backgroundColor: isDarkMode ? colors.accent : colors.secondary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      paddingHorizontal: 6,
    },
    badgeText: {
      color: isDarkMode ? '#222' : colors.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.background,
    },
    emptyText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.light : colors.text.secondary,
      textAlign: 'center',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: isDarkMode ? colors.text.light : colors.text.light,
      textAlign: 'center',
      marginTop: 8,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}

export default ConversationsScreen; 