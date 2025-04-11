// @ts-nocheck
import React from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { getConversation, sendMessage, markMessagesAsRead, subscribeToMessages, Message } from '../../services/messageService';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { friendId, friendName } = route.params;
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [inputText, setInputText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = React.useRef(null);
  const subscriptionRef = React.useRef(null);

  // Manejador para nuevos mensajes recibidos
  const handleNewMessage = React.useCallback((newMessage: Message) => {
    console.log('Mensaje recibido en handleNewMessage:', newMessage);
    
    if (
      (newMessage.sender_id === friendId && newMessage.receiver_id === user?.id) ||
      (newMessage.sender_id === user?.id && newMessage.receiver_id === friendId)
    ) {
      console.log('Mensaje corresponde a esta conversación, actualizando estado...');
      
      setMessages(prevMessages => {
        // Verificar si el mensaje ya existe para evitar duplicados
        const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
        if (messageExists) {
          console.log('Mensaje duplicado, ignorando:', newMessage.id);
          return prevMessages;
        }
        console.log('Añadiendo nuevo mensaje a la conversación:', newMessage.id);
        return [...prevMessages, newMessage];
      });
      
      // Marcar como leído si somos el receptor
      if (newMessage.receiver_id === user?.id) {
        console.log('Marcando mensaje como leído');
        markMessagesAsRead(user.id, friendId);
      }
    } else {
      console.log('El mensaje no pertenece a esta conversación');
    }
  }, [friendId, user?.id]);

  // Configurar suscripción a mensajes
  React.useEffect(() => {
    if (!user?.id || !friendId) return;

    console.log('Configurando suscripción a mensajes entre', user.id, 'y', friendId);

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      console.log('Limpiando suscripción anterior');
      subscriptionRef.current.unsubscribe();
    }

    // Crear nueva suscripción
    subscriptionRef.current = subscribeToMessages(user.id, handleNewMessage, friendId);
    console.log('Nueva suscripción creada');

    return () => {
      if (subscriptionRef.current) {
        console.log('Limpiando suscripción al desmontar');
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user?.id, friendId, handleNewMessage]);

  React.useEffect(() => {
    console.log('Efecto de inicialización del chat');
    checkUserAuth();
    
    navigation.setOptions({
      title: friendName || 'Chat',
    });
  }, []);

  const checkUserAuth = async () => {
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
              navigation.navigate('VerifyEmail', { email: data.user?.email });
            }
          }
        ]
      );
      return;
    }

    loadMessages();
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    
    console.log('Cargando mensajes entre', user.id, 'y', friendId);
    
    try {
      const conversationMessages = await getConversation(user.id, friendId);
      console.log('Mensajes obtenidos:', conversationMessages.length);
      setMessages(conversationMessages);
      await markMessagesAsRead(user.id, friendId);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (messages.length > 0) {
      console.log('Desplazando a último mensaje, total mensajes:', messages.length);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.id || sending) return;
    
    setSending(true);
    const trimmedMessage = inputText.trim();
    setInputText('');
    
    console.log('Enviando mensaje a', friendId);
    
    try {
      const newMessage = await sendMessage(user.id, friendId, trimmedMessage);
      if (newMessage) {
        console.log('Mensaje enviado con éxito:', newMessage.id);
        handleNewMessage(newMessage);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setInputText(trimmedMessage); // Restaurar el mensaje si falla
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
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