// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState, useCallback } from 'react';
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
    Image,
    TextInput,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import {
    getUserGroups,
    getPendingGroupInvitations,
    acceptGroupInvitation,
    rejectGroupInvitation,
    renameGroup,
    GroupWithMembers,
    deleteGroup,
    inviteUserToGroup,
    removeUserFromGroup,
    leaveGroup,
    getUsersNotInGroup,
    makeGroupAdmin
} from '../../services/groupService';
import {
    acceptJourneyInvitation,
    rejectJourneyInvitation
} from '../../services/shareService';

const GroupsScreen = () => {
    const [groups, setGroups] = useState<GroupWithMembers[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [availableFriends, setAvailableFriends] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [shouldCheckNavParams, setShouldCheckNavParams] = useState(true);

    const user = useSelector((state: RootState) => state.auth.user);
    const navigation = useNavigation();
    const route = useRoute();

    // Cargar grupos e invitaciones
    const loadData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            // Obtener grupos del usuario
            const userGroups = await getUserGroups(user.id);
            setGroups(userGroups);

            // Obtener invitaciones pendientes
            const invitations = await getPendingGroupInvitations(user.id);
            setPendingInvitations(invitations);
        } catch (error) {
            console.error('Error cargando datos de grupos:', error);
            Alert.alert('Error', 'No se pudieron cargar los grupos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    // Verificar parámetros de navegación después de cargar los grupos
    useEffect(() => {
        // Solo verificar parámetros si hay grupos cargados y shouldCheckNavParams es true
        if (groups.length > 0 && shouldCheckNavParams && route?.params?.showInviteModal && route?.params?.groupId) {
            const targetGroup = groups.find(g => g.id === route.params.groupId);
            if (targetGroup) {
                setSelectedGroup(targetGroup);
                openInviteModal(route.params.groupId);
                setShouldCheckNavParams(false); // Evitar que se ejecute nuevamente
            }
        }
    }, [groups, route?.params, shouldCheckNavParams]);

    // Cargar datos cuando la pantalla obtiene el foco
    useFocusEffect(
        useCallback(() => {
            loadData();
            // Resetear la bandera para verificar parámetros
            setShouldCheckNavParams(true);
        }, [loadData])
    );

    // Manejar la aceptación de una invitación
    const handleAcceptInvitation = async (invitation) => {
        try {
            setLoading(true);
            const success = await acceptGroupInvitation(invitation.id);

            if (success && invitation.journeyId) {
                // Si es una invitación de viaje, también actualizamos el estado en journeys_shared
                await acceptJourneyInvitation(invitation.journeyId, user.id, invitation.id);
            }

            Alert.alert('Éxito', 'Invitación aceptada correctamente');
            loadData();
        } catch (error) {
            console.error('Error al aceptar invitación:', error);
            Alert.alert('Error', 'No se pudo aceptar la invitación');
        } finally {
            setLoading(false);
        }
    };

    // Manejar el rechazo de una invitación
    const handleRejectInvitation = async (invitation) => {
        try {
            setLoading(true);
            const success = await rejectGroupInvitation(invitation.id);

            if (success && invitation.journeyId) {
                // Si es una invitación de viaje, también actualizamos el estado en journeys_shared
                await rejectJourneyInvitation(invitation.journeyId, user.id, invitation.id);
            }

            Alert.alert('Éxito', 'Invitación rechazada');
            loadData();
        } catch (error) {
            console.error('Error al rechazar invitación:', error);
            Alert.alert('Error', 'No se pudo rechazar la invitación');
        } finally {
            setLoading(false);
        }
    };

    // Mostrar opciones para el grupo
    const showGroupOptions = (group: GroupWithMembers) => {
        setSelectedGroup(group);

        // Verificar si el usuario es administrador del grupo
        const isAdmin = group.members.some(m =>
            m.userId === user?.id && m.role === 'admin'
        );

        // Si no es administrador, solo mostrar opciones limitadas
        if (!isAdmin) {
            // Mostrar opciones limitadas para usuarios normales
            Alert.alert(
                "Opciones del grupo",
                "¿Qué deseas hacer?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Ver miembros",
                        onPress: openMembersModal
                    },
                    {
                        text: "Salir del grupo",
                        style: "destructive",
                        onPress: handleLeaveGroup
                    }
                ]
            );
        } else {
            // Mostrar todas las opciones para administradores
            setOptionsModalVisible(true);
        }
    };

    // Abrir modal para renombrar grupo
    const openRenameModal = () => {
        if (!selectedGroup) return;
        setOptionsModalVisible(false);
        setNewGroupName(selectedGroup.name);
        setRenameModalVisible(true);
    };

    // Abrir modal para gestionar miembros
    const openMembersModal = () => {
        if (!selectedGroup) return;
        setOptionsModalVisible(false);
        setMembersModalVisible(true);
    };

    // Abrir modal para invitar amigos
    const openInviteModal = async (targetGroupId = null) => {
        // Usar el grupo seleccionado o el proporcionado por parámetro
        const groupId = targetGroupId || (selectedGroup ? selectedGroup.id : null);

        if (!groupId || !user?.id) return;

        setOptionsModalVisible(false);
        setInviteLoading(true);
        setInviteModalVisible(true);

        try {
            // Cargar amigos disponibles para invitar
            const friends = await getUsersNotInGroup(groupId, user.id);
            setAvailableFriends(friends);
        } catch (error) {
            console.error('Error cargando amigos disponibles:', error);
            Alert.alert('Error', 'No se pudieron cargar los amigos disponibles');
        } finally {
            setInviteLoading(false);
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

    // Manejar la expulsión de un miembro
    const handleRemoveMember = async (memberId) => {
        if (!selectedGroup) return;

        Alert.alert(
            "Eliminar Miembro",
            "¿Estás seguro de que deseas eliminar a este miembro del grupo?",
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
                            const success = await removeUserFromGroup(selectedGroup.id, memberId);

                            if (success) {
                                // Actualizar el grupo seleccionado para reflejar el cambio
                                const updatedGroup = { ...selectedGroup };
                                updatedGroup.members = updatedGroup.members.filter(m => m.userId !== memberId);
                                setSelectedGroup(updatedGroup);

                                Alert.alert('Éxito', 'Miembro eliminado correctamente');
                            } else {
                                Alert.alert('Error', 'No se pudo eliminar al miembro');
                            }
                        } catch (error) {
                            console.error('Error al eliminar miembro:', error);
                            Alert.alert('Error', 'No se pudo eliminar al miembro');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Manejar el cambio de rol a administrador
    const handleMakeAdmin = async (memberId) => {
        if (!selectedGroup) return;

        Alert.alert(
            "Hacer Administrador",
            "¿Estás seguro de que deseas hacer administrador a este miembro?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const success = await makeGroupAdmin(selectedGroup.id, memberId);

                            if (success) {
                                // Actualizar el grupo seleccionado para reflejar el cambio
                                const updatedGroup = { ...selectedGroup };
                                const memberIndex = updatedGroup.members.findIndex(m => m.userId === memberId);
                                if (memberIndex !== -1) {
                                    updatedGroup.members[memberIndex].role = 'admin';
                                    setSelectedGroup(updatedGroup);
                                }

                                Alert.alert('Éxito', 'El miembro ahora es administrador');
                            } else {
                                Alert.alert('Error', 'No se pudo cambiar el rol del miembro');
                            }
                        } catch (error) {
                            console.error('Error al hacer administrador:', error);
                            Alert.alert('Error', 'No se pudo cambiar el rol del miembro');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Manejar salir del grupo
    const handleLeaveGroup = async () => {
        if (!selectedGroup || !user?.id) return;

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
                            const success = await leaveGroup(selectedGroup.id, user.id);

                            if (success) {
                                Alert.alert('Éxito', 'Has salido del grupo correctamente');
                                loadData();
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

    // Manejar la eliminación de un grupo
    const handleDeleteGroup = async () => {
        if (!selectedGroup || !user?.id) return;

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
                            const success = await deleteGroup(selectedGroup.id, user.id);

                            if (success) {
                                Alert.alert('Éxito', 'Grupo eliminado correctamente');
                                loadData();
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

    // Manejar el renombrar un grupo
    const handleRenameGroup = async () => {
        if (!selectedGroup || !newGroupName.trim()) {
            return;
        }

        try {
            setLoading(true);
            const success = await renameGroup(selectedGroup.id, newGroupName.trim());

            if (success) {
                Alert.alert('Éxito', 'Grupo renombrado correctamente');
                setRenameModalVisible(false);
                loadData();
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

    const renderGroupItem = ({ item }) => {
        // Obtener los nombres de los miembros activos
        const activeMembers = item.members
            .filter(m => m.status === 'accepted')
            .map(m => m.username);

        // Mostrar solo los primeros 2 nombres y "+X más" si hay más de 2
        let membersText = '';
        if (activeMembers.length <= 2) {
            membersText = activeMembers.join(', ');
        } else {
            membersText = `${activeMembers[0]}, ${activeMembers[1]} y ${activeMembers.length - 2} más`;
        }

        // Verificar si el usuario es administrador
        const isAdmin = item.members.some(m =>
            m.userId === user?.id && m.role === 'admin'
        );

        return (
            <TouchableOpacity
                style={styles.chatGroup}
                onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
            >
                <View style={styles.groupAvatar}>
                    <Ionicons name="people" size={28} color="#005F9E" />
                </View>

                <View style={styles.groupInfo}>
                    <View style={styles.groupHeader}>
                        <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>

                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                showGroupOptions(item);
                            }}
                            style={styles.settingsButton}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color="#005F9E" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {membersText}
                    </Text>

                    {item.journey_id && (
                        <View style={styles.tripBadge}>
                            <Ionicons name="airplane-outline" size={12} color="white" />
                            <Text style={styles.tripBadgeText}>Viaje</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderInvitationItem = ({ item }) => (
        <View style={styles.invitationCard}>
            <Text style={styles.invitationTitle}>Invitación de {item.createdBy}</Text>
            <Text style={styles.invitationDescription}>{item.groupName}</Text>
            {item.description && (
                <Text style={styles.invitationDetails}>{item.description}</Text>
            )}

            <View style={styles.invitationButtons}>
                <TouchableOpacity
                    style={[styles.invitationButton, styles.acceptButton]}
                    onPress={() => handleAcceptInvitation(item)}
                >
                    <Text style={styles.buttonText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.invitationButton, styles.rejectButton]}
                    onPress={() => handleRejectInvitation(item)}
                >
                    <Text style={styles.buttonText}>Rechazar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size={40} color="#005F9E" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Chats Grupales</Text>

            {pendingInvitations.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Invitaciones Pendientes</Text>
                    <FlatList
                        data={pendingInvitations}
                        renderItem={renderInvitationItem}
                        keyExtractor={item => item.id}
                        style={styles.invitationsList}
                        ListEmptyComponent={null}
                    />
                </>
            )}

            <View style={styles.groupsContainer}>
                {groups.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={50} color="#ccc" />
                        <Text style={styles.emptyText}>
                            No tienes grupos de chat. Cuando compartas o te compartan un viaje, se crearán grupos de chat automáticamente.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={groups}
                        renderItem={renderGroupItem}
                        keyExtractor={item => item.id}
                        style={styles.groupsList}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    loadData();
                                }}
                            />
                        }
                    />
                )}
            </View>

            {/* Modal para opciones del grupo - solo para administradores */}
            <Modal
                visible={optionsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={styles.optionsModalContent}>
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={openRenameModal}
                        >
                            <Ionicons name="create-outline" size={22} color="#005F9E" />
                            <Text style={styles.optionText}>Renombrar grupo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={openMembersModal}
                        >
                            <Ionicons name="people-outline" size={22} color="#005F9E" />
                            <Text style={styles.optionText}>Gestionar miembros</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={openInviteModal}
                        >
                            <Ionicons name="person-add-outline" size={22} color="#005F9E" />
                            <Text style={styles.optionText}>Invitar amigos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={handleLeaveGroup}
                        >
                            <Ionicons name="exit-outline" size={22} color="#ff9800" />
                            <Text style={[styles.optionText, { color: '#ff9800' }]}>Salir del grupo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionItem, styles.deleteOption]}
                            onPress={handleDeleteGroup}
                        >
                            <Ionicons name="trash-outline" size={22} color="#f44336" />
                            <Text style={[styles.optionText, styles.deleteText]}>Eliminar grupo</Text>
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
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Renombrar Grupo</Text>
                        <TextInput
                            style={styles.input}
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            placeholder="Nuevo nombre del grupo"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setRenameModalVisible(false)}
                            >
                                <Text style={{ color: 'white' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleRenameGroup}
                            >
                                <Text style={{ color: 'white' }}>Guardar</Text>
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

                                <ScrollView style={{ width: '100%' }}>
                                    {selectedGroup.members.map((member) => {
                                        // Determinar si el usuario actual es admin
                                        const isCurrentUserAdmin = selectedGroup.members.some(
                                            m => m.userId === user?.id && m.role === 'admin'
                                        );

                                        // No mostrar opciones para el usuario actual
                                        const isCurrentUser = member.userId === user?.id;

                                        return (
                                            <View key={member.userId} style={styles.memberItem}>
                                                <View style={styles.memberInfo}>
                                                    <Text style={styles.memberName}>{member.username}</Text>
                                                    {member.role === 'admin' && (
                                                        <View style={styles.adminBadge}>
                                                            <Text style={styles.adminBadgeText}>Admin</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {isCurrentUserAdmin && !isCurrentUser && (
                                                    <View style={styles.memberActions}>
                                                        {member.role !== 'admin' && (
                                                            <TouchableOpacity
                                                                style={styles.memberAction}
                                                                onPress={() => handleMakeAdmin(member.userId)}
                                                            >
                                                                <Ionicons name="shield-outline" size={18} color="#005F9E" />
                                                            </TouchableOpacity>
                                                        )}

                                                        <TouchableOpacity
                                                            style={styles.memberAction}
                                                            onPress={() => handleRemoveMember(member.userId)}
                                                        >
                                                            <Ionicons name="remove-circle-outline" size={18} color="#f44336" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
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
                            <ActivityIndicator size={24} color="#005F9E" style={{ padding: 20 }} />
                        ) : availableFriends.length > 0 ? (
                            <ScrollView style={{ width: '100%' }}>
                                {availableFriends.map((friend) => (
                                    <View key={friend.id} style={styles.friendItem}>
                                        <Text style={styles.friendName}>{friend.username}</Text>
                                        <TouchableOpacity
                                            style={styles.inviteButton}
                                            onPress={() => handleInviteUser(friend.id)}
                                        >
                                            <Text style={styles.inviteButtonText}>Invitar</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyFriends}>
                                <Ionicons name="people-outline" size={50} color="#ccc" />
                                <Text style={styles.emptyFriendsText}>
                                    No hay amigos disponibles para invitar. Todos tus amigos ya están en el grupo o han sido invitados.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#005F9E',
        marginBottom: 16,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    groupsContainer: {
        flex: 1,
    },
    groupsList: {
        flex: 1,
    },
    invitationsList: {
        maxHeight: 200, // Limitar altura para las invitaciones
    },
    // Estilos para el chat
    chatGroup: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e6f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupInfo: {
        flex: 1,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        backgroundColor: '#f0f7ff',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 15,
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    settingsButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: '#e6f7ff',
        borderWidth: 1,
        borderColor: '#c1e0ff',
        marginLeft: 8,
    },
    lastMessage: {
        fontSize: 14,
        color: '#777',
        marginBottom: 2,
    },
    tripBadge: {
        flexDirection: 'row',
        backgroundColor: '#005F9E',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    tripBadgeText: {
        color: 'white',
        fontSize: 10,
        marginLeft: 2,
    },
    editButton: {
        padding: 5,
    },
    // Estilos para invitaciones
    invitationCard: {
        backgroundColor: '#e6f7ff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#b3e0ff',
    },
    invitationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#005F9E',
    },
    invitationDescription: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    invitationDetails: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    invitationButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
    },
    invitationButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginLeft: 8,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
    },
    // Estilos para modal de opciones
    optionsModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        marginTop: 'auto',
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    optionItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    deleteOption: {
        borderBottomWidth: 0,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 10,
        color: '#333',
    },
    deleteText: {
        color: '#f44336',
    },
    // Estilos para modal de renombrar
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 10,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#999',
    },
    confirmButton: {
        backgroundColor: '#005F9E',
    },
    // Nuevos estilos
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberName: {
        fontSize: 16,
        color: '#333',
    },
    adminBadge: {
        backgroundColor: '#005F9E',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 10,
    },
    adminBadgeText: {
        color: 'white',
        fontSize: 12,
    },
    memberActions: {
        flexDirection: 'row',
    },
    memberAction: {
        padding: 8,
        marginLeft: 5,
    },
    friendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%',
    },
    friendName: {
        fontSize: 16,
        color: '#333',
    },
    inviteButton: {
        backgroundColor: '#005F9E',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    inviteButtonText: {
        color: 'white',
        fontSize: 14,
    },
    emptyFriends: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyFriendsText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 10,
    },
    infoMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6f7ff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        width: '100%',
    },
    infoMessageText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
});

export default GroupsScreen; 