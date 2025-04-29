// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
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
  Alert,
  Image,
  Modal,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { 
  getConversation, 
  sendMessage, 
  markMessagesAsRead, 
  subscribeToMessages, 
  Message, 
  sendImageMessage,
  getGroupMessages,
  sendGroupMessage,
  subscribeToGroupMessages,
  markGroupMessagesAsRead
} from '../../services/messageService';
import { getGroupById } from '../../services/groupService';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/cloudinaryService';
import NotificationService from '../../services/NotificationService';
import { getUserInfoById as getUserInfo } from '../../services/userService';

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { friendId, friendName, groupId, groupName } = route.params || {};
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [fullImageViewVisible, setFullImageViewVisible] = useState(false);
  const [currentFullImage, setCurrentFullImage] = useState('');
  const [friendProfile, setFriendProfile] = useState<any>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef(null);
  const initialLoadRef = useRef(true);
  const messageCountRef = useRef(0);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  // Verificar si es un chat grupal
  useEffect(() => {
    if (route.params?.isGroupChat || groupId) {
      setIsGroupChat(true);
    }
  }, [route.params, groupId]);

  // Cargar los datos iniciales
  useEffect(() => {
    checkUserAuth();
    
    if (isGroupChat && groupId) {
      loadGroupChat();
    } else if (friendId) {
      loadFriendChat();
    }
  }, [isGroupChat, groupId, friendId]);

  // Cargar información del chat grupal
  const loadGroupChat = async () => {
    try {
      setLoading(true);
      console.log('Cargando chat de grupo con ID:', groupId);
      
      // Obtener información del grupo
      const groupData = await getGroupById(groupId);
      if (groupData) {
        setGroupInfo(groupData);
        
        // Cargar mensajes del grupo
        const groupMessages = await getGroupMessages(groupId);
        if (groupMessages && groupMessages.length > 0) {
          setMessages(groupMessages);
          messageCountRef.current = groupMessages.length;
          
          // Marcar todos los mensajes como leídos
          if (user?.id) {
            await markGroupMessagesAsRead(groupId, user.id);
          }
        } else {
          console.log('No hay mensajes en este grupo');
          setMessages([]);
          messageCountRef.current = 0;
        }
      } else {
        console.log('No se pudo obtener información del grupo');
      }
    } catch (error) {
      console.error('Error cargando información del grupo:', error);
      Alert.alert('Error', 'No se pudo cargar la información del grupo');
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  };

  // Cargar información del chat individual
  const loadFriendChat = async () => {
    try {
      setLoading(true);
      
      // Obtener información del amigo
      const friendData = await getUserInfo(friendId);
      if (friendData) {
        setGroupInfo(friendData);
        setFriendProfile(friendData);
      }
      
      // Cargar mensajes con este amigo
      await loadMessages();
    } catch (error) {
      console.error('Error cargando información del amigo:', error);
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  };

  // Manejador para nuevos mensajes recibidos
  const handleNewMessage = React.useCallback((newMessage: Message) => {
    console.log('Mensaje recibido en handleNewMessage:', newMessage);
    
    // Para chat grupal, verificar si pertenece a este grupo
    if (isGroupChat && groupId) {
      if (newMessage.group_id === groupId) {
        setMessages(prevMessages => {
          // Verificar si el mensaje ya existe para evitar duplicados
          const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return prevMessages;
          }
          
          // Actualizar contador de referencia
          messageCountRef.current = prevMessages.length + 1;
          return [...prevMessages, newMessage];
        });
        
        // Marcar como leído si no somos el remitente
        if (newMessage.sender_id !== user?.id) {
          markGroupMessagesAsRead(groupId, user?.id);
        }
      }
      return;
    }
    
    // Para chat individual, verificar si pertenece a esta conversación
    if (!isGroupChat && friendId && (
      (newMessage.sender_id === friendId && newMessage.receiver_id === user?.id) ||
      (newMessage.sender_id === user?.id && newMessage.receiver_id === friendId)
    )) {
      setMessages(prevMessages => {
        // Verificar si el mensaje ya existe para evitar duplicados
        const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
        if (messageExists) {
          return prevMessages;
        }
        
        // Actualizar contador de referencia
        messageCountRef.current = prevMessages.length + 1;
        return [...prevMessages, newMessage];
      });
      
      // Marcar como leído si somos el receptor
      if (newMessage.receiver_id === user?.id) {
        markMessagesAsRead(user.id, friendId);
      }
    }
  }, [friendId, user?.id, isGroupChat, groupId]);

  // Función para cargar mensajes (solo para chat individual)
  const loadMessages = React.useCallback(async () => {
    if (!user?.id || !friendId || isGroupChat) return;
    
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
    }
  }, [user?.id, friendId, isGroupChat]);

  // Efecto para configurar la suscripción y limpiarla al desmontar
  React.useEffect(() => {
    setupMessageSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        console.log('Limpiando suscripción al desmontar');
        subscriptionRef.current();
      }
    };
  }, [setupMessageSubscription]);

  // Configurar suscripción a mensajes - separado para mayor claridad
  const setupMessageSubscription = React.useCallback(() => {
    if (!user?.id) return;
    
    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      console.log('Limpiando suscripción anterior');
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    
    // Configurar suscripción según el tipo de chat
    if (isGroupChat && groupId) {
      // Implementar suscripción a mensajes grupales
      console.log('Configurando suscripción a mensajes de grupo:', groupId);
      subscriptionRef.current = subscribeToGroupMessages(groupId, handleNewMessage);
    } else if (friendId) {
      // Suscripción a mensajes individuales
      console.log('Configurando suscripción a mensajes entre', user.id, 'y', friendId);
      subscriptionRef.current = subscribeToMessages(user.id, handleNewMessage, friendId);
    } 
    
  }, [user?.id, friendId, handleNewMessage, isGroupChat, groupId]);

  // Verificar autenticación y cargar datos iniciales
  React.useEffect(() => {
    console.log('Efecto de inicialización del chat');
    checkUserAuth();
    
    navigation.setOptions({
      title: isGroupChat ? groupName : friendName || 'Chat',
    });

    // Configurar un intervalo para actualizar los mensajes periódicamente
    const refreshInterval = setInterval(() => {
      if (!initialLoadRef.current) {
        if (isGroupChat && groupId) {
          refreshGroupMessages();
        } else if (friendId) {
          loadMessages();
        }
      }
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [navigation, friendName, loadMessages, isGroupChat, groupId, groupName]);

  // Función para refrescar mensajes de grupo
  const refreshGroupMessages = async () => {
    if (!groupId || !user?.id) return;
    
    try {
      console.log('Refrescando mensajes del grupo:', groupId);
      const groupMessages = await getGroupMessages(groupId);
      
      if (groupMessages && groupMessages.length !== messageCountRef.current) {
        setMessages(groupMessages);
        messageCountRef.current = groupMessages.length;
        
        // Marcar mensajes como leídos
        await markGroupMessagesAsRead(groupId, user.id);
      }
    } catch (error) {
      console.error('Error refrescando mensajes del grupo:', error);
    }
  };

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

    // Solo cargar mensajes para chat individual aquí
    if (!isGroupChat && friendId) {
      loadMessages();
    }
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
      if (isGroupChat && groupId) {
        // Subir imagen a Cloudinary
        const imageUrl = await uploadImage(selectedImage);
        if (imageUrl) {
          const newMessage = await sendGroupMessage(groupId, '', imageUrl);
          if (newMessage) {
            handleNewMessage(newMessage);
          }
        }
      } else if (friendId) {
        const newMessage = await sendImageMessage(user.id, friendId, selectedImage);
        if (newMessage) {
          handleNewMessage(newMessage);
        }
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
    if ((!inputText.trim() && !selectedImage) || !user) {
      return;
    }

    try {
      // Distintos comportamientos para chats grupales e individuales
      if (isGroupChat && groupId) {
        // Mensaje para grupo
        let imageUrl = null;
        if (selectedImage) {
          imageUrl = await uploadImage(selectedImage);
        }
        
        // Preparar mensaje para mostrar inmediatamente en UI
        const tempMessage = {
          id: `temp-${Date.now()}`,
          sender_id: user.id,
          group_id: groupId,
          text: imageUrl ? '' : inputText.trim(), // No mostrar texto si es una imagen
          created_at: new Date().toISOString(),
          read: false,
          sender_username: user.username,
          image_url: imageUrl
        };
        
        // Agregar mensaje temporal a la UI
        setMessages(prevMessages => [...prevMessages, tempMessage]);
        
        // Enviar mensaje al servidor
        await sendGroupMessage(groupId, inputText.trim(), imageUrl);
      } else if (friendId) {
        // Para chat individual
        let imageUrl = null;
        
        // Si hay una imagen seleccionada, subirla primero
        if (selectedImage) {
          try {
            // Subir imagen directamente
            const newImageMsg = await sendImageMessage(user.id, friendId, selectedImage);
            
            if (newImageMsg) {
              // Agregar mensaje de imagen a la UI
              setMessages(prevMessages => [...prevMessages, {
                ...newImageMsg,
                text: '', // Asegurar que no haya texto para mensajes de imagen
                sender_username: user.username
              }]);
            }
          } catch (imgError) {
            console.error('Error enviando imagen:', imgError);
            Alert.alert('Error', 'No se pudo enviar la imagen');
          }
        }
        
        // Si también hay texto, enviar como un mensaje separado
        if (inputText.trim()) {
          // Crear un mensaje temporal para la UI
          const tempTextMessage = {
            id: `temp-${Date.now()}`,
            sender_id: user.id,
            receiver_id: friendId,
            content: inputText.trim(),
            text: inputText.trim(),
            created_at: new Date().toISOString(),
            read: false,
            sender_username: user.username
          };
          
          // Agregar mensaje temporal a la UI
          setMessages(prevMessages => [...prevMessages, tempTextMessage]);
          
          // Enviar mensaje de texto
          await sendMessage(friendId, inputText.trim());
        }
      }
      
      // Limpiar campos
      setInputText('');
      setSelectedImage(null);
      setImagePreviewVisible(false);

      // Mover automáticamente al final de la lista
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  };

  // Personalizar el encabezado de navegación
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          {isGroupChat ? (
            <View style={styles.headerGroupInfo}>
              <Text style={styles.headerName}>{groupName || 'Grupo'}</Text>
              <Text style={styles.headerSubtitle}>
                {groupInfo?.members?.length || 0} miembros
              </Text>
            </View>
          ) : (
            <View style={styles.headerUserInfo}>
              {friendProfile?.profile_picture ? (
                <Image 
                  source={{ uri: friendProfile.profile_picture }} 
                  style={styles.headerProfilePicture}
                />
              ) : (
                <View style={styles.headerProfilePicturePlaceholder}>
                  <Text style={styles.headerProfilePictureText}>
                    {friendName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.headerUserTextInfo}>
                <Text style={styles.headerName}>{friendName}</Text>
                {groupInfo?.status && (
                  <Text style={styles.headerSubtitle}>
                    {groupInfo.status}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ),
      headerStyle: {
        backgroundColor: '#005F9E',
      },
      headerTintColor: 'white',
    });
  }, [navigation, friendName, isGroupChat, groupName, groupInfo, friendProfile]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
      </View>
    );
  }

  // Renderizar un mensaje individual
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const messageDate = new Date(item.created_at);
    const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Para mensajes grupales, mostrar el nombre del remitente si no es propio
    const shouldShowSender = isGroupChat && !isOwnMessage;
    
    // Determinar si el mensaje es una imagen
    const hasImage = item.image_url || 
                    (item.content && 
                     typeof item.content === 'string' && 
                     item.content.startsWith('http') && 
                     (item.content.includes('.jpg') || 
                      item.content.includes('.jpeg') || 
                      item.content.includes('.png') || 
                      item.content.includes('.gif') || 
                      item.content.includes('cloudinary')));
    
    // Obtener el contenido de texto del mensaje (solo si no es una imagen)
    const messageText = !hasImage ? (item.text || item.content || null) : null;
    
    // Obtener la URL de la imagen si existe
    const imageUrl = item.image_url || (hasImage ? item.content : null);

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {shouldShowSender && (
          <Text style={styles.messageSender}>{item.sender_username}</Text>
        )}
        
        {imageUrl && (
          <TouchableOpacity onPress={() => viewFullImage(imageUrl)}>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.messageImage} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        
        {messageText && (
          <Text style={styles.messageText}>{messageText}</Text>
        )}
        
        <Text style={styles.messageTime}>{timeString}</Text>
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
  ownMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#005F9E',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 5,
    marginBottom: 5,
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
  attachButton: {
    padding: 8,
    marginRight: 5,
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
  // Estilos para vista previa de imagen
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  imagePreviewContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
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
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ccc',
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
  // Estilos para el encabezado
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerGroupInfo: {
    marginLeft: 10,
  },
  headerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  backButton: {
    padding: 5,
  },
  // Estilos para mensajes grupales
  messageSender: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0084FF',
    marginBottom: 2,
  },
  headerProfilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerProfilePicturePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerProfilePictureText: {
    color: '#005F9E',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserTextInfo: {
    flex: 1,
  },
});

export default ChatScreen; 