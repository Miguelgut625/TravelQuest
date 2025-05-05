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
  SafeAreaView,
  ScrollView,
  StatusBar
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
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef(null);
  const initialLoadRef = useRef(true);
  const messageCountRef = useRef(0);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [menuState, setMenuState] = useState({
    isVisible: false,
    isProcessing: false,
    lastPressTime: 0
  });
  // Estados para gestión de miembros y invitaciones
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [availableFriends, setAvailableFriends] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  // Estado para modal de información del grupo
  const [groupInfoModalVisible, setGroupInfoModalVisible] = useState(false);

  // Verificar si es un chat grupal
  useEffect(() => {
    if (route.params?.isGroupChat || groupId) {
      setIsGroupChat(true);
    }

    // Ocultar la barra de navegación nativa ya que usamos nuestra propia cabecera
    navigation.setOptions({
      headerShown: false
    });
  }, [route.params, groupId, navigation]);

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

  // Manejar el menú de opciones de grupo
  const handleMenuPress = React.useCallback(() => {
    // Evitar múltiples clics rápidos
    const now = Date.now();
    const timeSinceLastPress = now - menuState.lastPressTime;

    // Prevenir múltiples aperturas en menos de 500ms
    if (timeSinceLastPress < 500 || menuState.isProcessing) {
      return;
    }
    
    setMenuState(prev => ({
      ...prev,
      isProcessing: true,
      lastPressTime: now
    }));
    
    // Verificar si el usuario es administrador del grupo
    if (!groupInfo || !isGroupChat || !groupId) {
      setMenuState(prev => ({ ...prev, isProcessing: false }));
      return;
    }

    const isAdmin = groupInfo.members.some(m => 
      m.userId === user?.id && m.role === 'admin'
    );
    
    const showMenu = () => {
      if (isAdmin) {
        Alert.alert(
          "Opciones del grupo",
          "¿Qué deseas hacer?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => {
              setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
            }},
            { 
              text: "Renombrar grupo", 
              onPress: () => {
                setNewGroupName(groupName);
                setRenameModalVisible(true);
                setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
              }
            },
            { 
              text: "Gestionar miembros", 
              onPress: async () => {
                try {
                  if (!groupId) return;
                  
                  // Obtener la información actualizada del grupo
                  const groupData = await getGroupById(groupId);
                  
                  if (groupData) {
                    setSelectedGroup(groupData);
                    setMembersModalVisible(true);
                  } else {
                    Alert.alert('Error', 'No se pudo obtener la información del grupo');
                  }
                } catch (error) {
                  console.error('Error al abrir el modal de miembros:', error);
                  Alert.alert('Error', 'No se pudo cargar la información de los miembros');
                } finally {
                  setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                }
              }
            },
            { 
              text: "Invitar amigos", 
              onPress: async () => {
                try {
                  if (!groupId || !user?.id) return;
                  
                  setInviteLoading(true);
                  setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                  setSelectedGroup(groupInfo);
                  setInviteModalVisible(true);
                  
                  // Cargar amigos disponibles para invitar
                  const friends = await getUsersNotInGroup(groupId, user.id);
                  setAvailableFriends(friends);
                } catch (error) {
                  console.error('Error cargando amigos disponibles:', error);
                  Alert.alert('Error', 'No se pudieron cargar los amigos disponibles');
                } finally {
                  setInviteLoading(false);
                }
              }
            },
            { 
              text: "Eliminar grupo", 
              style: "destructive",
              onPress: async () => {
                Alert.alert(
                  "Eliminar Grupo",
                  "¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.",
                  [
                    { text: "Cancelar", style: "cancel", onPress: () => {
                      setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                    }},
                    { 
                      text: "Eliminar", 
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const success = await deleteGroup(groupId, user.id);
                          
                          if (success) {
                            Alert.alert('Éxito', 'Grupo eliminado correctamente');
                            navigation.goBack();
                          } else {
                            Alert.alert('Error', 'No se pudo eliminar el grupo');
                          }
                        } catch (error) {
                          console.error('Error al eliminar grupo:', error);
                          Alert.alert('Error', 'No se pudo eliminar el grupo');
                        } finally {
                          setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Opciones del grupo",
          "¿Qué deseas hacer?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => {
              setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
            }},
            { 
              text: "Ver miembros", 
              onPress: async () => {
                try {
                  if (!groupId) return;
                  
                  // Obtener la información actualizada del grupo
                  const groupData = await getGroupById(groupId);
                  
                  if (groupData) {
                    setSelectedGroup(groupData);
                    setMembersModalVisible(true);
                  } else {
                    Alert.alert('Error', 'No se pudo obtener la información del grupo');
                  }
                } catch (error) {
                  console.error('Error al abrir el modal de miembros:', error);
                  Alert.alert('Error', 'No se pudo cargar la información de los miembros');
                } finally {
                  setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                }
              }
            },
            { 
              text: "Salir del grupo", 
              style: "destructive",
              onPress: async () => {
                Alert.alert(
                  "Salir del Grupo",
                  "¿Estás seguro de que deseas salir de este grupo?",
                  [
                    { text: "Cancelar", style: "cancel", onPress: () => {
                      setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                    }},
                    { 
                      text: "Salir", 
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const success = await leaveGroup(groupId, user.id);
                          
                          if (success) {
                            Alert.alert('Éxito', 'Has salido del grupo correctamente');
                            navigation.goBack();
                          } else {
                            Alert.alert('Error', 'No se pudo salir del grupo');
                          }
                        } catch (error) {
                          console.error('Error al salir del grupo:', error);
                          Alert.alert('Error', 'No se pudo salir del grupo');
                        } finally {
                          setMenuState(prev => ({ ...prev, isVisible: false, isProcessing: false }));
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      }
    };

    // Usar setTimeout para asegurar que el estado se actualice antes de mostrar el menú
    setTimeout(showMenu, 0);
  }, [groupInfo, user?.id, groupId, groupName, navigation, menuState.lastPressTime]);

  // Manejar el renombrar un grupo
  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !groupId) return;
    
    try {
      const success = await renameGroup(groupId, newGroupName.trim());
      
      if (success) {
        // Actualizar el nombre en la navegación
        navigation.setParams({ groupName: newGroupName.trim() });
        Alert.alert('Éxito', 'Grupo renombrado correctamente');
      } else {
        Alert.alert('Error', 'No se pudo renombrar el grupo');
      }
    } catch (error) {
      console.error('Error al renombrar grupo:', error);
      Alert.alert('Error', 'No se pudo renombrar el grupo');
    } finally {
      setRenameModalVisible(false);
    }
  };

  // Función para abrir el modal de gestión de miembros
  const openGroupMembers = async () => {
    try {
      if (!groupId) return;
      
      // Obtener la información actualizada del grupo
      const groupData = await getGroupById(groupId);
      
      if (groupData) {
        setSelectedGroup(groupData);
        setMembersModalVisible(true);
      } else {
        Alert.alert('Error', 'No se pudo obtener la información del grupo');
      }
    } catch (error) {
      console.error('Error al abrir el modal de miembros:', error);
      Alert.alert('Error', 'No se pudo cargar la información de los miembros');
    }
  };

  // Manejar la invitación de un usuario
  const handleInviteUser = async (friendId) => {
    if (!selectedGroup || !user?.id) return;
    
    try {
      setInviteLoading(true);
      const success = await inviteUserToGroup(
        selectedGroup.id,
        friendId,
        user.id
      );
      
      if (success) {
        Alert.alert('Éxito', 'Invitación enviada correctamente');
        // Actualizar la lista de amigos disponibles
        const updatedFriends = availableFriends.filter(f => f.id !== friendId);
        setAvailableFriends(updatedFriends);
      } else {
        Alert.alert('Error', 'No se pudo enviar la invitación');
      }
    } catch (error) {
      console.error('Error invitando usuario:', error);
      Alert.alert('Error', 'No se pudo enviar la invitación');
    } finally {
      setInviteLoading(false);
    }
  };

  // Función para cambiar el rol de un miembro
  const handleChangeRole = async (memberId, currentRole) => {
    if (!selectedGroup || !user?.id) return;
    
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const action = currentRole === 'admin' ? 'quitar administración' : 'hacer administrador';
    const actionFunction = currentRole === 'admin' ? removeGroupAdmin : makeGroupAdmin;
    
    Alert.alert(
      currentRole === 'admin' ? "Quitar Administración" : "Hacer Administrador",
      `¿Estás seguro de que deseas ${action} a este miembro?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: async () => {
            try {
              const success = await actionFunction(selectedGroup.id, memberId);
              
              if (success) {
                // Actualizar el estado local
                const updatedGroup = {...selectedGroup};
                const memberIndex = updatedGroup.members.findIndex(m => m.userId === memberId);
                if (memberIndex !== -1) {
                  updatedGroup.members[memberIndex].role = newRole;
                  setSelectedGroup(updatedGroup);
                }
                
                Alert.alert('Éxito', `Se ha cambiado el rol del miembro correctamente`);
                
                // Refrescar la información del grupo
                if (groupId) {
                  const groupData = await getGroupById(groupId);
                  if (groupData) {
                    setGroupInfo(groupData);
                  }
                }
              } else {
                const errorMsg = currentRole === 'admin' 
                  ? 'No se puede quitar el rol al único administrador del grupo' 
                  : 'No se pudo cambiar el rol del miembro';
                Alert.alert('Error', errorMsg);
              }
            } catch (error) {
              console.error(`Error al ${action}:`, error);
              Alert.alert('Error', `No se pudo ${action}`);
            }
          }
        }
      ]
    );
  };

  // Función para eliminar un miembro del grupo
  const handleRemoveMember = async (memberId) => {
    if (!selectedGroup || !user?.id) return;
    
    Alert.alert(
      "Eliminar Miembro",
      "¿Estás seguro de que deseas eliminar a este miembro del grupo?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              const success = await removeUserFromGroup(selectedGroup.id, memberId);
              
              if (success) {
                // Actualizar el estado local
                const updatedGroup = {...selectedGroup};
                updatedGroup.members = updatedGroup.members.filter(m => m.userId !== memberId);
                setSelectedGroup(updatedGroup);
                
                Alert.alert('Éxito', 'Miembro eliminado correctamente');
                
                // Refrescar la información del grupo
                if (groupId) {
                  const groupData = await getGroupById(groupId);
                  if (groupData) {
                    setGroupInfo(groupData);
                  }
                }
              } else {
                Alert.alert('Error', 'No se pudo eliminar al miembro del grupo');
              }
            } catch (error) {
              console.error('Error al eliminar miembro:', error);
              Alert.alert('Error', 'No se pudo eliminar al miembro del grupo');
            }
          }
        }
      ]
    );
  };

  // Función para mostrar la información del grupo
  const showGroupInfo = () => {
    if (isGroupChat && groupInfo) {
      setGroupInfoModalVisible(true);
    }
  };

  // Función para mostrar el modal de invitación
  const handleShowInviteModal = async () => {
    try {
      if (!groupId || !user?.id) return;
      
      setInviteLoading(true);
      // Obtener información actualizada del grupo
      const groupData = await getGroupById(groupId);
      
      if (groupData) {
        setSelectedGroup(groupData);
        
        // Cargar amigos disponibles para invitar
        const friends = await getUsersNotInGroup(groupId, user.id);
        setAvailableFriends(friends);
        setInviteModalVisible(true);
      } else {
        Alert.alert('Error', 'No se pudo obtener la información del grupo');
      }
    } catch (error) {
      console.error('Error cargando amigos disponibles:', error);
      Alert.alert('Error', 'No se pudieron cargar los amigos disponibles');
    } finally {
      setInviteLoading(false);
    }
  };

  // Función para cargar más mensajes antiguos
  const loadMoreMessages = () => {
    // Esta función ahora debería cargar mensajes más antiguos (al inicio de la lista)
    console.log('Cargar mensajes más antiguos');
    // Implementar paginación hacia atrás si es necesario
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    // Formatear la fecha
    const messageDate = new Date(item.created_at);
    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Determinar si es un mensaje propio o de otro usuario
    const messageContainerStyle = [
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ];
    
    // Estilos específicos para texto de mensajes de otros usuarios
    const messageTextStyle = [
      styles.messageText,
      !isOwnMessage && styles.otherMessageText
    ];
    
    // Estilos específicos para el timestamp de mensajes de otros usuarios
    const timeStyle = [
      styles.messageTime,
      !isOwnMessage && styles.otherMessageTime
    ];
    
    return (
      <View style={messageContainerStyle}>
        {/* Si es grupo y no es un mensaje propio, mostrar el nombre */}
        {isGroupChat && !isOwnMessage && (
          <Text style={{ 
            fontSize: 13, 
            fontWeight: 'bold', 
            color: '#007AFF',
            marginBottom: 2
          }}>
            {item.sender_username || 'Usuario'}
          </Text>
        )}
        
        {/* Contenido del mensaje (imagen o texto) */}
        {item.image_url ? (
          <TouchableOpacity onPress={() => viewFullImage(item.image_url)}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <Text style={messageTextStyle}>
            {item.text || item.content}
          </Text>
        )}
        
        {/* Hora del mensaje */}
        <Text style={timeStyle}>{formattedTime}</Text>
      </View>
    );
  };

  // Actualizar la función para desplazarse al final cuando hay mensajes nuevos
  React.useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, loading]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor="#005F9E" barStyle="light-content" />
      
      {/* Espacio para la barra de estado */}
      <View style={{ 
        height: Platform.OS === 'ios' ? 47 : 24, 
        backgroundColor: '#005F9E' 
      }} />
      
      {/* Header personalizado */}
      <View style={styles.header}>
        <View style={styles.headerLeftSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerInfo}
            onPress={showGroupInfo}
            activeOpacity={isGroupChat ? 0.7 : 1}
          >
            <View style={styles.headerAvatar}>
              {isGroupChat ? (
                <Ionicons name="people" size={18} color="white" />
              ) : (
                <Text style={styles.headerAvatarText}>
                  {friendName ? friendName.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {isGroupChat ? groupName : friendName}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {isGroupChat 
                  ? `${groupInfo?.members?.length || 0} miembros` 
                  : 'En línea'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {isGroupChat && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleMenuPress}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#005F9E" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesContainer}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              Alert.alert(
                'Añadir contenido',
                'Selecciona una opción',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Tomar foto', onPress: takePhoto },
                  { text: 'Seleccionar imagen', onPress: pickImage }
                ]
              )
            }}
          >
            <Ionicons name="add-circle-outline" size={28} color="#005F9E" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() && !selectedImage) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImage) || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Modal de vista previa de imagen seleccionada */}
        <Modal
          visible={imagePreviewVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImagePreviewVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.previewTitle}>Enviar imagen</Text>
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
                    setSelectedImage(null);
                    setImagePreviewVisible(false);
                  }}
                >
                  <Text style={styles.previewButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewButton, { backgroundColor: '#005F9E' }]}
                  onPress={sendSelectedImage}
                >
                  <Text style={styles.previewButtonText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para mostrar imagen a pantalla completa */}
        <Modal
          visible={fullImageViewVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullImageViewVisible(false)}
        >
          <View style={styles.fullImageContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFullImageViewVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>
            {currentFullImage && (
              <Image
                source={{ uri: currentFullImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* Modal para renombrar grupo */}
        <Modal
          visible={renameModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Renombrar Grupo</Text>
                <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Nombre del grupo"
                autoFocus
              />
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setRenameModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={handleRenameGroup}
                >
                  <Text style={styles.modalButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de información del grupo */}
        <Modal
          visible={groupInfoModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setGroupInfoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.groupInfoModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Información del Grupo</Text>
                <TouchableOpacity onPress={() => setGroupInfoModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.groupInfoScrollView}>
                <View style={styles.groupInfoSection}>
                  <View style={styles.groupAvatarLarge}>
                    <Ionicons name="people" size={40} color="white" />
                  </View>
                  <Text style={styles.groupInfoName}>{groupName}</Text>
                  <Text style={styles.groupInfoMembers}>
                    {groupInfo?.members?.length || 0} miembros
                  </Text>
                </View>

                {groupInfo?.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Descripción</Text>
                    <Text style={styles.descriptionText}>
                      {groupInfo.description}
                    </Text>
                  </View>
                )}

                <View style={styles.membersSection}>
                  <Text style={styles.sectionTitle}>Miembros</Text>
                  {groupInfo?.members?.map(member => (
                    <View key={member.userId} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {member.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.username}</Text>
                        <Text style={styles.memberRole}>
                          {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                        </Text>
                      </View>
                      {member.userId === user?.id && (
                        <Text style={styles.youLabel}>Tú</Text>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.groupInfoActions}>
                {groupInfo?.members?.some(m => m.userId === user?.id && m.role === 'admin') ? (
                  <TouchableOpacity 
                    style={styles.groupInfoActionButton}
                    onPress={() => {
                      setGroupInfoModalVisible(false);
                      // Retrasar para evitar conflictos de modales
                      setTimeout(() => handleShowInviteModal(), 300);
                    }}
                  >
                    <Ionicons name="person-add" size={20} color="#005F9E" />
                    <Text style={styles.groupInfoActionText}>Invitar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.groupInfoActionButton, styles.leaveButton]}
                    onPress={() => {
                      setGroupInfoModalVisible(false);
                      // Retrasar para evitar conflictos de modales
                      setTimeout(() => {
                        Alert.alert(
                          "Salir del Grupo",
                          "¿Estás seguro de que deseas salir de este grupo?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            { 
                              text: "Salir", 
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  const success = await leaveGroup(groupId, user.id);
                                  if (success) {
                                    Alert.alert('Éxito', 'Has salido del grupo correctamente');
                                    navigation.goBack();
                                  } else {
                                    Alert.alert('Error', 'No se pudo salir del grupo');
                                  }
                                } catch (error) {
                                  console.error('Error al salir del grupo:', error);
                                  Alert.alert('Error', 'No se pudo salir del grupo');
                                }
                              }
                            }
                          ]
                        );
                      }, 300);
                    }}
                  >
                    <Ionicons name="exit-outline" size={20} color="#FF3B30" />
                    <Text style={styles.leaveGroupText}>Salir del grupo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para gestionar miembros */}
        <Modal
          visible={membersModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setMembersModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Miembros del Grupo</Text>
                <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {selectedGroup && (
                <>
                  {/* Mostrar mensaje informativo para usuarios que no son administradores */}
                  {!selectedGroup.members.some(m => m.userId === user?.id && m.role === 'admin') && (
                    <View style={styles.infoMessage}>
                      <Ionicons name="information-circle" size={20} color="#005F9E" />
                      <Text style={styles.infoMessageText}>
                        Solo puedes ver los miembros. Para gestionar el grupo debes ser administrador.
                      </Text>
                    </View>
                  )}
                  
                  <FlatList
                    data={selectedGroup.members}
                    keyExtractor={(item) => item.userId.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {item.username.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.memberName}>{item.username}</Text>
                            <Text style={styles.memberRole}>
                              {item.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Solo mostrar opciones de gestión si el usuario actual es admin */}
                        {selectedGroup.members.some(m => m.userId === user?.id && m.role === 'admin') && 
                         item.userId !== user?.id && (
                          <TouchableOpacity 
                            style={styles.memberAction}
                            onPress={() => {
                              Alert.alert(
                                "Opciones",
                                `¿Qué deseas hacer con ${item.username}?`,
                                [
                                  { text: "Cancelar", style: "cancel" },
                                  { 
                                    text: item.role === 'admin' ? "Quitar administración" : "Hacer administrador", 
                                    onPress: () => {
                                      handleChangeRole(item.userId, item.role);
                                    }
                                  },
                                  { 
                                    text: "Eliminar del grupo", 
                                    style: "destructive",
                                    onPress: () => {
                                      handleRemoveMember(item.userId);
                                    }
                                  }
                                ]
                              );
                            }}
                          >
                            <Ionicons name="ellipsis-vertical" size={24} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal para invitar amigos */}
        <Modal
          visible={inviteModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invitar Amigos</Text>
                <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {inviteLoading ? (
                <ActivityIndicator size="large" color="#005F9E" style={{ margin: 20 }} />
              ) : availableFriends.length > 0 ? (
                <FlatList
                  data={availableFriends}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.friendItem}>
                      <View style={styles.friendInfo}>
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>
                            {item.username.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.friendName}>{item.username}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.inviteButton}
                        onPress={() => handleInviteUser(item.id)}
                      >
                        <Text style={styles.inviteButtonText}>Invitar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people" size={50} color="#cccccc" />
                  <Text style={styles.emptyText}>No tienes más amigos para invitar a este grupo</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#005F9E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    height: 100, // Altura fija
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  headerButton: {
    padding: 8,
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
    borderRadius: 20,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#005F9E',
    borderTopRightRadius: 4,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 5,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachButton: {
    padding: 6,
    marginRight: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    maxHeight: 100,
    marginHorizontal: 5,
  },
  sendButton: {
    marginLeft: 5,
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
  // Estilos para modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelModalButton: {
    backgroundColor: '#ccc',
  },
  confirmModalButton: {
    backgroundColor: '#005F9E',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Estilos para modal de información del grupo
  groupInfoModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  groupInfoScrollView: {
    maxHeight: 500,
  },
  groupInfoSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupInfoName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  groupInfoMembers: {
    fontSize: 16,
    color: '#666',
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  membersSection: {
    padding: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  youLabel: {
    fontSize: 14,
    color: '#005F9E',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  groupInfoActions: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
  },
  groupInfoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5F1FF',
  },
  leaveButton: {
    backgroundColor: '#FFE5E5',
  },
  groupInfoActionText: {
    color: '#005F9E',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  leaveGroupText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // ... resto de los estilos existentes ...
});

export default ChatScreen;