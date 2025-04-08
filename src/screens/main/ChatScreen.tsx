import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { getConversation, sendMessage, markMessagesAsRead, subscribeToMessages, Message } from '../../services/messageService';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';

type ChatScreenRouteProp = RouteProp<{ Chat: { friendId: string, friendName: string } }, 'Chat'>;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { friendId, friendName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkUserAuth();
    
    // Configurar el título de la pantalla con el nombre del amigo
    navigation.setOptions({
      title: friendName || 'Chat',
    });
  }, []);

  // Manejador para nuevos mensajes recibidos
  const handleNewMessage = (newMessage: Message) => {
    if (newMessage.sender_id === friendId) {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      // Marcar como leído inmediatamente
      markMessagesAsRead(user?.id || '', friendId);
    }
  };

  const checkUserAuth = async () => {
    // Verificar si el usuario está autenticado
    if (!user) {
      Alert.alert(
        "No autenticado",
        "Por favor inicia sesión para acceder al chat",
        [
          { 
            text: "OK", 
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }] as never[]
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
        "Por favor verifica tu correo electrónico para acceder al chat. Revisa tu bandeja de entrada.",
        [
          { 
            text: "OK", 
            onPress: () => {
              // @ts-ignore - Para solucionar problemas de tipado con la navegación
              navigation.navigate('VerifyEmail', { email: data.user?.email });
            }
          }
        ]
      );
      return;
    }

    // Si todo está bien, cargamos los mensajes y configuramos la suscripción
    loadMessages();
    
    // Configurar suscripción a mensajes en tiempo real
    // Pasamos friendId para suscribirnos específicamente a esta conversación
    const subscription = subscribeToMessages(user.id, handleNewMessage, friendId);
    
    // Limpiar suscripción al desmontar
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  };

  // Función para cargar los mensajes
  const loadMessages = async () => {
    if (!user?.id) return;
    
    const conversationMessages = await getConversation(user.id, friendId);
    setMessages(conversationMessages);
    setLoading(false);
    
    // Marcar mensajes como leídos
    await markMessagesAsRead(user.id, friendId);
  };

  // Desplazarse al último mensaje
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, loading]);

  // Función para enviar un mensaje
  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.id || sending) return;
    
    setSending(true);
    const trimmedMessage = inputText.trim();
    setInputText('');
    
    const newMessage = await sendMessage(user.id, friendId, trimmedMessage);
    if (newMessage) {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    }
    
    setSending(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005F9E" />
      </View>
    );
  }

  // Renderizar un mensaje individual
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.friendMessage,
      ]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
          multiline
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) ? styles.sendButtonDisabled : null
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#005F9E',
  },
  friendMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#005F9E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatScreen; 