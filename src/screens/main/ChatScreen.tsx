// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
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
  Alert,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getConversation, sendMessage, markMessagesAsRead, subscribeToMessages, Message, sendImageMessage } from '../../services/messageService';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { friendId, friendName } = route.params;
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [inputText, setInputText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [imagePreviewVisible, setImagePreviewVisible] = React.useState(false);
  const [fullImageViewVisible, setFullImageViewVisible] = React.useState(false);
  const [currentFullImage, setCurrentFullImage] = React.useState('');
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = React.useRef(null);
  const subscriptionRef = React.useRef(null);
  const initialLoadRef = React.useRef(true);
  const messageCountRef = React.useRef(0);
  const insets = useSafeAreaInsets();

  // Manejador para nuevos mensajes recibidos
  const handleNewMessage = React.useCallback((newMessage: Message) => {
    console.log('Mensaje recibido en handleNewMessage:', newMessage);
    
    // Doble verificación para asegurarnos que el mensaje pertenece a esta conversación
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
        console.log('Añadiendo nuevo mensaje a la conversación:', newMessage.id, 'Total ahora:', prevMessages.length + 1);
        
        // Actualizar contador de referencia
        messageCountRef.current = prevMessages.length + 1;
        
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

  // Función para cargar mensajes
  const loadMessages = React.useCallback(async () => {
    if (!user?.id) return;
    
    console.log('Cargando mensajes entre', user.id, 'y', friendId);
    setRefreshing(true);
    
    try {
      const conversationMessages = await getConversation(user.id, friendId);
      console.log('Mensajes obtenidos:', conversationMessages.length);
      
      // Verificar si hay cambios en los mensajes
      if (conversationMessages.length !== messageCountRef.current) {
        console.log('Actualizando lista de mensajes. Antes:', messageCountRef.current, 'Ahora:', conversationMessages.length);
        setMessages(conversationMessages);
        messageCountRef.current = conversationMessages.length;
      } else {
        console.log('No hay nuevos mensajes para actualizar');
      }
      
      await markMessagesAsRead(user.id, friendId);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadRef.current = false;
    }
  }, [user?.id, friendId]);

  // Configurar suscripción a mensajes - separado para mayor claridad
  const setupMessageSubscription = React.useCallback(() => {
    if (!user?.id || !friendId) return;
    
    console.log('Configurando suscripción a mensajes entre', user.id, 'y', friendId);

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      console.log('Limpiando suscripción anterior');
      subscriptionRef.current.unsubscribe();
      // Asegurarse de que la referencia se limpie completamente
      subscriptionRef.current = null;
      
      // Añadir un pequeño retraso para asegurar que la limpieza se complete
      setTimeout(() => {
        // Verificar que no se haya recreado la suscripción en el intervalo
        if (!subscriptionRef.current) {
          // Crear nueva suscripción
          subscriptionRef.current = subscribeToMessages(user.id, handleNewMessage, friendId);
          console.log('Nueva suscripción creada');
        }
      }, 300);
    } else {
      // Si no hay suscripción previa, crear una nueva inmediatamente
      subscriptionRef.current = subscribeToMessages(user.id, handleNewMessage, friendId);
      console.log('Nueva suscripción creada');
    }
  }, [user?.id, friendId, handleNewMessage]);

  // Efecto para configurar la suscripción y limpiarla al desmontar
  React.useEffect(() => {
    setupMessageSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        console.log('Limpiando suscripción al desmontar');
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [setupMessageSubscription]);

  // Verificar autenticación y cargar datos iniciales
  React.useEffect(() => {
    console.log('Efecto de inicialización del chat');
    checkUserAuth();
    
    navigation.setOptions({
      title: friendName || 'Chat',
    });

    // Configurar un intervalo para actualizar los mensajes periódicamente
    const refreshInterval = setInterval(() => {
      if (!initialLoadRef.current) {  // Solo si ya se completó la carga inicial
        console.log('Actualizando mensajes periódicamente...');
        loadMessages();
      }
    }, 5000);  // Actualizar cada 5 segundos (más frecuente)

    return () => {
      clearInterval(refreshInterval);
    };
  }, [navigation, friendName, loadMessages]);

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

  // Desplazar al último mensaje cuando cambie la lista de mensajes
  React.useEffect(() => {
    if (messages.length > 0) {
      console.log('Desplazando a último mensaje, total mensajes:', messages.length);
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 200);
    }
  }, [messages]);

  // Función para seleccionar imagen de la galería
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };
  
  // Función para tomar una foto con la cámara
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };
  
  // Función para enviar la imagen seleccionada
  const sendSelectedImage = async () => {
    if (!selectedImage || !user?.id || sending) return;
    
    setSending(true);
    setImagePreviewVisible(false);
    
    try {
      const newMessage = await sendImageMessage(user.id, friendId, selectedImage);
      if (newMessage) {
        console.log('Mensaje con imagen enviado con éxito:', newMessage.id);
        handleNewMessage(newMessage);
      }
      setSelectedImage(null);
    } catch (error) {
      console.error('Error enviando imagen:', error);
      Alert.alert('Error', 'No se pudo enviar la imagen');
    } finally {
      setSending(false);
    }
  };

  // Ver imagen completa
  const viewFullImage = (imageUrl) => {
    setCurrentFullImage(imageUrl);
    setFullImageViewVisible(true);
  };

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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
      </View>
    );
  }

  // Renderizar un mensaje individual
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    const isImageMessage = item.content.startsWith('http') && 
      (item.content.includes('.jpg') || 
       item.content.includes('.jpeg') || 
       item.content.includes('.png') || 
       item.content.includes('.gif') ||
       item.content.includes('cloudinary.com'));
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.friendMessage,
      ]}>
        {isImageMessage ? (
          <TouchableOpacity onPress={() => viewFullImage(item.content)}>
            <Image 
              source={{ uri: item.content }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <Text style={styles.messageText}>{item.content}</Text>
        )}
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onRefresh={loadMessages}
        refreshing={refreshing}
      />
      
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={pickImage}
        >
          {/* @ts-ignore */}
          <Ionicons name="image-outline" size={24} color="#005F9E" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={takePhoto}
        >
          {/* @ts-ignore */}
          <Ionicons name="camera-outline" size={24} color="#005F9E" />
        </TouchableOpacity>
        
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
            // @ts-ignore
            <Ionicons name="send" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Modal de vista previa de imagen */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.imagePreviewContainer}>
            <Text style={styles.previewTitle}>Vista Previa</Text>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={[styles.previewButton, styles.cancelButton]}
                onPress={() => {
                  setImagePreviewVisible(false);
                  setSelectedImage(null);
                }}
              >
                <Text style={styles.previewButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewButton, styles.sendButton]}
                onPress={sendSelectedImage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.previewButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal para ver imagen completa */}
      <Modal
        visible={fullImageViewVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.fullImageContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullImageViewVisible(false)}
          >
            {/* @ts-ignore */}
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: currentFullImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    paddingTop: 24, // <-- margen superior general
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingTop: 32, // <-- margen superior solo para los mensajes
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#7F5AF0', // Violeta misterioso
  },
  friendMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#232634', // Fondo misterioso
  },
  messageText: {
    fontSize: 16,
    color: '#FFF',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 5,
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232634', // Fondo misterioso
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attachButton: {
    padding: 8,
    marginRight: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#393552', // Input misterioso
    borderRadius: 20,
    maxHeight: 100,
    color: '#FFF',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#2CB67D', // Verde neón misterioso
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#393552',
  },
  // Estilos para vista previa de imagen
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24,26,32,0.95)',
  },
  imagePreviewContainer: {
    width: '90%',
    backgroundColor: '#232634',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5D90A',
    marginBottom: 15,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 5,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  previewButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  previewButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#7F5AF0',
  },
  // Estilos para imagen a pantalla completa
  fullImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});

export default ChatScreen; 