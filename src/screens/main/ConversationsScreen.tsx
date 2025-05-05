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
  Modal,
  TextInput,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { getAllConversations } from '../../services/messageService';
import { supabase } from '../../services/supabase';
import { 
  getGroupById, 
  renameGroup, 
  deleteGroup, 
  leaveGroup, 
  getUsersNotInGroup,
  inviteUserToGroup,
  makeGroupAdmin,
  removeGroupAdmin,
  removeUserFromGroup,
  createGroup 
} from '../../services/groupService';
import { getUserInfoById } from '../../services/userService';
import { getFriends } from '../../services/friendService';

interface Conversation {
  conversation_id: string;
  is_group: boolean;
  name: string;
  last_message: string;
  created_at: string;
  unread_count: number;
  last_message_sender?: string;
}

const ConversationsScreen = () => {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Estados para el modal de opciones de grupo
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Estados para gestión de miembros e invitaciones
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [availableFriends, setAvailableFriends] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Estados para el modal de creación de grupo
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });
  const [groupCreationLoading, setGroupCreationLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

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
      // Usamos la nueva función que combina chats personales y grupales
      const conversationsData = await getAllConversations(user.id);
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

  const openChat = (conversation: Conversation) => {
    if (conversation.is_group) {
      // Navegar al chat grupal
      navigation.navigate('Chat', { 
        groupId: conversation.conversation_id, 
        groupName: conversation.name,
        isGroupChat: true
      });
    } else {
      // Navegar al chat individual
      navigation.navigate('Chat', { 
        friendId: conversation.conversation_id, 
        friendName: conversation.name 
      });
    }
  };

  // Funciones para manejar las opciones del grupo
  const showGroupOptions = (groupId, groupName) => {
    setSelectedGroupId(groupId);
    setSelectedGroupName(groupName);
    setNewGroupName(groupName);
    setOptionsModalVisible(true);
  };

  // Función para cargar y mostrar el modal de gestión de miembros
  const handleShowMembersModal = async () => {
    try {
      setOptionsModalVisible(false);
      setLoading(true);
      
      // Obtener información actualizada del grupo
      const groupData = await getGroupById(selectedGroupId);
      
      if (groupData) {
        setSelectedGroup(groupData);
        setMembersModalVisible(true);
      } else {
        Alert.alert('Error', 'No se pudo obtener la información del grupo');
      }
    } catch (error) {
      console.error('Error cargando miembros del grupo:', error);
      Alert.alert('Error', 'No se pudo cargar la información de los miembros');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar y mostrar el modal de invitación
  const handleShowInviteModal = async () => {
    try {
      setOptionsModalVisible(false);
      setInviteLoading(true);
      
      // Obtener información actualizada del grupo
      const groupData = await getGroupById(selectedGroupId);
      
      if (groupData) {
        setSelectedGroup(groupData);
        
        // Cargar amigos disponibles para invitar
        const friends = await getUsersNotInGroup(selectedGroupId, user.id);
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

  // Función para invitar a un usuario al grupo
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
              setLoading(true);
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
                const groupData = await getGroupById(selectedGroup.id);
                if (groupData) {
                  setSelectedGroup(groupData);
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
            } finally {
              setLoading(false);
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
              setLoading(true);
              const success = await removeUserFromGroup(selectedGroup.id, memberId);
              
              if (success) {
                // Actualizar el estado local
                const updatedGroup = {...selectedGroup};
                updatedGroup.members = updatedGroup.members.filter(m => m.userId !== memberId);
                setSelectedGroup(updatedGroup);
                
                Alert.alert('Éxito', 'Miembro eliminado correctamente');
                
                // Refrescar la información del grupo
                const groupData = await getGroupById(selectedGroup.id);
                if (groupData) {
                  setSelectedGroup(groupData);
                }
              } else {
                Alert.alert('Error', 'No se pudo eliminar al miembro del grupo');
              }
            } catch (error) {
              console.error('Error al eliminar miembro:', error);
              Alert.alert('Error', 'No se pudo eliminar al miembro del grupo');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !selectedGroupId) return;
    
    try {
      setOptionsModalVisible(false);
      setRenameModalVisible(false);
      setLoading(true);
      const success = await renameGroup(selectedGroupId, newGroupName.trim());
      
      if (success) {
        // Actualizar la lista de conversaciones
        fetchConversations();
        Alert.alert('Éxito', 'Grupo renombrado correctamente');
      } else {
        Alert.alert('Error', 'No se pudo renombrar el grupo');
      }
    } catch (error) {
      console.error('Error al renombrar grupo:', error);
      Alert.alert('Error', 'No se pudo renombrar el grupo');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !user?.id) return;
    
    setOptionsModalVisible(false);
    
    Alert.alert(
      "Eliminar Grupo",
      "¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const success = await deleteGroup(selectedGroupId, user.id);
              
              if (success) {
                Alert.alert('Éxito', 'Grupo eliminado correctamente');
                fetchConversations();
              } else {
                Alert.alert('Error', 'No se pudo eliminar el grupo. Asegúrate de que seas el administrador.');
              }
            } catch (error) {
              console.error('Error al eliminar grupo:', error);
              Alert.alert('Error', 'No se pudo eliminar el grupo');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleLeaveGroup = async () => {
    if (!selectedGroupId || !user?.id) return;
    
    setOptionsModalVisible(false);
    
    Alert.alert(
      "Salir del Grupo",
      "¿Estás seguro de que deseas salir de este grupo?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const success = await leaveGroup(selectedGroupId, user.id);
              
              if (success) {
                Alert.alert('Éxito', 'Has salido del grupo correctamente');
                fetchConversations();
              } else {
                Alert.alert('Error', 'No se pudo salir del grupo. Si eres el único administrador, debes transferir la administración a otro miembro primero.');
              }
            } catch (error) {
              console.error('Error al salir del grupo:', error);
              Alert.alert('Error', 'No se pudo salir del grupo');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Función para cargar los amigos del usuario
  const loadFriends = async () => {
    if (!user) return;

    setLoadingFriends(true);
    try {
      const friendsList = await getFriends(user.id);
      setFriends(friendsList || []);
    } catch (error) {
      console.error('Error cargando amigos:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Manejar la apertura del modal de creación de grupo
  const handleOpenCreateGroupModal = () => {
    setCreateGroupModalVisible(true);
    loadFriends();
    setSelectedFriends([]);
  };

  // Manejar la selección/deselección de amigos
  const toggleFriendSelection = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  // Función para crear un nuevo grupo con invitaciones
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el grupo');
      return;
    }

    setGroupCreationLoading(true);
    try {
      const createdGroup = await createGroup(
        newGroup.name.trim(), 
        user.id, 
        newGroup.description.trim() || undefined
      );

      if (createdGroup) {
        // Invitar a los amigos seleccionados
        if (selectedFriends.length > 0) {
          const invitePromises = selectedFriends.map(friendId => 
            inviteUserToGroup(createdGroup.id, friendId, user.id)
          );
          await Promise.all(invitePromises);
        }

        // Actualizar la lista de conversaciones
        fetchConversations();
        setCreateGroupModalVisible(false);
        // Limpiar el formulario
        setNewGroup({ name: '', description: '' });
        setSelectedFriends([]);
        
        // Mostrar mensaje de éxito y navegar al chat del grupo recién creado
        Alert.alert(
          'Grupo creado', 
          `El grupo ${createdGroup.name} se ha creado correctamente${selectedFriends.length > 0 ? ' y se han enviado invitaciones' : ''}.`,
          [
            { 
              text: 'Ir al chat', 
              onPress: () => navigation.navigate('Chat', { 
                groupId: createdGroup.id, 
                groupName: createdGroup.name,
                isGroupChat: true
              })
            }
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo crear el grupo. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      Alert.alert('Error', 'Ocurrió un error al crear el grupo');
    } finally {
      setGroupCreationLoading(false);
    }
  };

  // Renderizar un elemento de amigo para selección
  const renderFriendItem = ({ item }) => {
    const isSelected = selectedFriends.includes(item.user2Id);
    
    return (
      <TouchableOpacity 
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => toggleFriendSelection(item.user2Id)}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendAvatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.friendName}>{item.username}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#005F9E" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#005F9E" />
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

    // Avatar placeholder seguro cuando no hay nombre
    const avatarLetter = item.name && item.name.length > 0 
      ? item.name.charAt(0).toUpperCase() 
      : '?';

    // Formatear mensaje con nombre en chats grupales
    const formattedMessage = item.is_group && item.last_message_sender && item.last_message
      ? `${item.last_message_sender}: ${item.last_message}`
      : item.last_message || 'No hay mensajes';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChat(item)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.avatar,
          item.is_group ? styles.groupAvatar : styles.userAvatar
        ]}>
          {item.is_group ? (
            <Ionicons name="people" size={26} color="white" />
          ) : (
            <Text style={styles.avatarText}>
              {avatarLetter}
            </Text>
          )}
        </View>
        
        <View style={styles.messageInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.username}>{item.name || 'Usuario'}</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
            {/* Icono de tres puntos solo para grupos */}
            {item.is_group && (
              <TouchableOpacity
                style={{ marginLeft: 8, padding: 6, borderRadius: 16, backgroundColor: '#eaf1fa' }}
                onPress={(e) => {
                  e.stopPropagation();
                  showGroupOptions(item.conversation_id, item.name);
                }}
                activeOpacity={0.6}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#005F9E" />
              </TouchableOpacity>
            )}
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
              {formattedMessage}
            </Text>
            
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleOpenCreateGroupModal}
        >
          <Ionicons name="add" size={24} color="#005F9E" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            No tienes conversaciones aún.
          </Text>
          <Text style={styles.emptySubtext}>
            Ve a la pantalla de amigos o grupos para iniciar un chat.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => `${item.is_group ? 'group' : 'direct'}-${item.conversation_id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#005F9E']}
            />
          }
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Groups')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal con opciones de grupo */}
      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setOptionsModalVisible(false);
                setRenameModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={24} color="#005F9E" />
              <Text style={styles.optionText}>Renombrar grupo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleShowMembersModal}
            >
              <Ionicons name="people-outline" size={24} color="#005F9E" />
              <Text style={styles.optionText}>Gestionar miembros</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleShowInviteModal}
            >
              <Ionicons name="person-add-outline" size={24} color="#005F9E" />
              <Text style={styles.optionText}>Invitar amigos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleLeaveGroup}
            >
              <Ionicons name="exit-outline" size={24} color="#ff9800" />
              <Text style={[styles.optionText, { color: '#ff9800' }]}>Salir del grupo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash-outline" size={24} color="#f44336" />
              <Text style={[styles.optionText, { color: '#f44336' }]}>Eliminar grupo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal para renombrar grupo */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameModalContent}>
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

      {/* Modal para gestionar miembros */}
      <Modal
        visible={membersModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.renameModalContent, { maxHeight: '80%' }]}>
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
          <View style={[styles.renameModalContent, { maxHeight: '80%' }]}>
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
                keyExtractor={(item) => `friend-${item.id}`}
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

      {/* Modal para crear un nuevo grupo */}
      <Modal
        visible={createGroupModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateGroupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.renameModalContent, { width: '90%', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Nuevo Grupo</Text>
              <TouchableOpacity onPress={() => setCreateGroupModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>Nombre del grupo *</Text>
              <TextInput
                style={styles.modalInput}
                value={newGroup.name}
                onChangeText={(text) => setNewGroup({...newGroup, name: text})}
                placeholder="Ej: Viaje a Barcelona"
                autoFocus
              />
              
              <Text style={styles.inputLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={newGroup.description}
                onChangeText={(text) => setNewGroup({...newGroup, description: text})}
                placeholder="Describe el propósito del grupo"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                Invitar amigos (opcional)
              </Text>
              
              {loadingFriends ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#005F9E" />
                  <Text style={styles.loadingText}>Cargando amigos...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyFriendsContainer}>
                  <Text style={styles.emptyFriendsText}>
                    No tienes amigos para invitar.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCreateGroupModalVisible(false);
                      navigation.navigate('Friends');
                    }}
                  >
                    <Text style={styles.addFriendsLink}>
                      Añade amigos primero
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.friendsContainer}>
                  <FlatList
                    data={friends}
                    renderItem={renderFriendItem}
                    keyExtractor={(item) => item.user2Id}
                    horizontal={false}
                    scrollEnabled={false}  // El scroll lo maneja el ScrollView padre
                  />
                  <Text style={styles.selectedCount}>
                    {selectedFriends.length} amigos seleccionados
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setCreateGroupModalVisible(false);
                  setNewGroup({ name: '', description: '' });
                  setSelectedFriends([]);
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmModalButton,
                  groupCreationLoading && { opacity: 0.7 }
                ]}
                onPress={handleCreateGroup}
                disabled={groupCreationLoading}
              >
                {groupCreationLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButton: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    backgroundColor: 'white',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatar: {
    backgroundColor: '#007AFF',
  },
  groupAvatar: {
    backgroundColor: '#005F9E',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  messageInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#005F9E',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: '80%',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Estilos para modal de opciones
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 0,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  // Estilos para modal de renombrar grupo
  renameModalContent: {
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
    fontSize: 16,
  },
  // Estilos para miembros
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
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
  memberAction: {
    padding: 8,
  },
  infoMessage: {
    flexDirection: 'row',
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  infoMessageText: {
    color: '#005F9E',
    marginLeft: 5,
    flex: 1,
  },
  
  // Estilos para amigos e invitaciones
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f5f5f5',
  },
  selectedFriendItem: {
    backgroundColor: 'rgba(0, 95, 158, 0.1)',
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
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  friendAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  inviteButton: {
    backgroundColor: '#005F9E',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    marginTop: 8,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  formNote: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  formNoteText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalScrollContent: {
    maxHeight: '70%',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyFriendsContainer: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginVertical: 10,
  },
  emptyFriendsText: {
    color: '#666',
    marginBottom: 8,
  },
  addFriendsLink: {
    color: '#005F9E',
    fontWeight: 'bold',
  },
  friendsContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default ConversationsScreen; 