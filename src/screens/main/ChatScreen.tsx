// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
  StatusBar,
  RefreshControl
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
import {
  getGroupById,
  renameGroup,
  deleteGroup,
  leaveGroup,
  getUsersNotInGroup,
  inviteUserToGroup,
  removeGroupAdmin,
  makeGroupAdmin,
  removeUserFromGroup
} from '../../services/groupService';
import { supabase } from '../../services/supabase';
import { TabParamList } from '../../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../services/cloudinaryService';
import NotificationService from '../../services/NotificationService';
import { getUserInfoById as getUserInfo } from '../../services/userService';
import { SafeAreaView } from 'react-native-safe-area-context';


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

  // Añadir configuración del StatusBar
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(colors.primary);
    StatusBar.setTranslucent(true);
  }, []);

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
      try {
        subscriptionRef.current.unsubscribe();
      } catch (error) {
        console.error('Error al limpiar suscripción anterior:', error);
      }
      // Asegurarse de que la referencia se limpie completamente
      subscriptionRef.current = null;
    }
    
    // Crear nueva suscripción después de un pequeño retraso para asegurar limpieza
    setTimeout(() => {
      if (!subscriptionRef.current) {
        subscriptionRef.current = subscribeToMessages(user.id, handleNewMessage, friendId);
        console.log('Nueva suscripción creada');
      }
    }, 300);
  }, [user?.id, friendId, handleNewMessage]);

  // Efecto para configurar la suscripción y limpiarla al desmontar
  React.useEffect(() => {
    setupMessageSubscription();

    return () => {
      if (subscriptionRef.current) {
        console.log('Limpiando suscripción al desmontar');
        try {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        } catch (error) {
          console.error('Error al limpiar suscripción al desmontar:', error);
        }
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

    const messageStyle = isMyMessage ? styles.myMessage : styles.friendMessage;
    const textColor = isMyMessage ? colors.white : colors.text.primary;
    const timeColor = isMyMessage ? colors.white : colors.text.light;

    return (
      <View style={[
        styles.messageContainer,
        messageStyle,
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
          <Text style={[styles.messageText, { color: textColor }]}>
            {item.content}
          </Text>
        )}
        <Text style={[styles.messageTime, { color: timeColor }]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
          <TouchableOpacity
            style={styles.groupsButton}
            onPress={() => navigation.navigate('Groups')}
          >
            <Ionicons name="people" size={22} color={colors.text.light} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onRefresh={loadMessages}
          refreshing={refreshing}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadMessages}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachButton}
            onPress={takePhoto}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.text.light}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={22} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Modal de vista previa de imagen */}
        <Modal
          visible={imagePreviewVisible}
          transparent={true}
          animationType="fade"
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
                  style={[styles.previewButton, { backgroundColor: colors.primary }]}
                  onPress={sendSelectedImage}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.white} />
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
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Image
              source={{ uri: currentFullImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    height: Platform.OS === 'ios' ? 44 : 56,
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  groupsButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.secondary,
  },
  friendMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderWidth: 0,
  },
  messageText: {
    fontSize: 16,
    color: props => props.style.backgroundColor === colors.primary ? colors.white : colors.text.primary,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: props => props.style.backgroundColor === colors.primary ? colors.white : colors.text.light,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 20,
    maxHeight: 100,
    color: colors.text.primary,
    marginRight: 8,
    borderColor: colors.border,
    borderWidth: 1,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imagePreviewContainer: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
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
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  previewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
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
    backgroundColor: colors.white,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen; 