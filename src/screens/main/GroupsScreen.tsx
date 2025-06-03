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
    ScrollView,
    Platform
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../../styles/theme';

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

    const { colors, isDarkMode } = useTheme();
    const groupStyles = getGroupStyles(colors, isDarkMode);

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
                style={groupStyles.chatGroup}
                onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
            >
                <View style={[groupStyles.groupAvatar, isDarkMode && { backgroundColor: colors.accent }]}>
                    <Ionicons name="people" size={28} color={isDarkMode ? '#181C22' : colors.primary} />
                </View>

                <View style={groupStyles.groupInfo}>
                    <View style={groupStyles.groupHeader}>
                        <Text style={groupStyles.groupName} numberOfLines={1}>{item.name}</Text>

                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                showGroupOptions(item);
                            }}
                            style={groupStyles.settingsButton}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={isDarkMode ? colors.accent : colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={groupStyles.lastMessage} numberOfLines={1}>
                        {membersText}
                    </Text>

                    {item.journey_id && (
                        <View style={[groupStyles.tripBadge, isDarkMode && { backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center' }]}>
                            <Ionicons name="airplane-outline" size={12} color={isDarkMode ? '#181C22' : colors.surface} />
                            <Text style={[groupStyles.tripBadgeText, isDarkMode && { color: '#181C22' }]}>Viaje</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderInvitationItem = ({ item }) => (
        <View style={groupStyles.invitationCard}>
            <Text style={groupStyles.invitationTitle}>Invitación de {item.createdBy}</Text>
            <Text style={groupStyles.invitationDescription}>{item.groupName}</Text>
            {item.description && (
                <Text style={groupStyles.invitationDetails}>{item.description}</Text>
            )}

            <View style={groupStyles.invitationButtons}>
                <TouchableOpacity
                    style={[groupStyles.invitationButton, groupStyles.acceptButton]}
                    onPress={() => handleAcceptInvitation(item)}
                >
                    <Text style={groupStyles.buttonText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[groupStyles.invitationButton, groupStyles.rejectButton]}
                    onPress={() => handleRejectInvitation(item)}
                >
                    <Text style={groupStyles.buttonText}>Rechazar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={groupStyles.loadingContainer}>
                <ActivityIndicator size={40} color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={groupStyles.safeArea} edges={['top']}>
            <View style={groupStyles.headerContainer}>
                <TouchableOpacity
                    style={[groupStyles.backButton, isDarkMode && { backgroundColor: colors.accent }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#181C22' : colors.surface} />
                </TouchableOpacity>
                <Text style={groupStyles.headerTitle}>Chats Grupales</Text>
                <View style={groupStyles.headerRight} />
            </View>

            {pendingInvitations.length > 0 && (
                <View style={groupStyles.invitationsContainer}>
                    <Text style={groupStyles.sectionTitle}>Invitaciones Pendientes</Text>
                    <FlatList
                        data={pendingInvitations}
                        renderItem={renderInvitationItem}
                        keyExtractor={item => item.id}
                        style={groupStyles.invitationsList}
                        ListEmptyComponent={null}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            )}

            <View style={groupStyles.groupsContainer}>
                {groups.length === 0 ? (
                    <View style={groupStyles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={60} color={colors.secondary} />
                        <Text style={groupStyles.emptyText}>
                            No tienes grupos de chat
                        </Text>
                        <Text style={groupStyles.emptySubtext}>
                            Cuando compartas o te compartan un viaje, se crearán grupos de chat automáticamente
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={groups}
                        renderItem={renderGroupItem}
                        keyExtractor={item => item.id}
                        style={groupStyles.groupsList}
                        contentContainerStyle={groupStyles.groupsListContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    loadData();
                                }}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
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
                    style={groupStyles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={groupStyles.optionsModalContent}>
                        <TouchableOpacity
                            style={groupStyles.optionItem}
                            onPress={openRenameModal}
                        >
                            <Ionicons name="create-outline" size={22} color={colors.primary} />
                            <Text style={groupStyles.optionText}>Renombrar grupo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={groupStyles.optionItem}
                            onPress={openMembersModal}
                        >
                            <Ionicons name="people-outline" size={22} color={colors.primary} />
                            <Text style={groupStyles.optionText}>Gestionar miembros</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={groupStyles.optionItem}
                            onPress={openInviteModal}
                        >
                            <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                            <Text style={groupStyles.optionText}>Invitar amigos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={groupStyles.optionItem}
                            onPress={handleLeaveGroup}
                        >
                            <Ionicons name="exit-outline" size={22} color={colors.secondary} />
                            <Text style={[groupStyles.optionText, { color: colors.secondary }]}>Salir del grupo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[groupStyles.optionItem, groupStyles.deleteOption]}
                            onPress={handleDeleteGroup}
                        >
                            <Ionicons name="trash-outline" size={22} color={colors.error} />
                            <Text style={[groupStyles.optionText, groupStyles.deleteText]}>Eliminar grupo</Text>
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
                <View style={groupStyles.modalOverlay}>
                    <View style={groupStyles.modalContent}>
                        <Text style={groupStyles.modalTitle}>Renombrar Grupo</Text>
                        <TextInput
                            style={groupStyles.input}
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            placeholder="Nuevo nombre del grupo"
                        />
                        <View style={groupStyles.modalButtons}>
                            <TouchableOpacity
                                style={[groupStyles.modalButton, groupStyles.cancelButton]}
                                onPress={() => setRenameModalVisible(false)}
                            >
                                <Text style={{ color: 'white' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[groupStyles.modalButton, groupStyles.confirmButton]}
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
                <View style={groupStyles.modalOverlay}>
                    <View style={[groupStyles.modalContent, { maxHeight: '80%' }]}>
                        <View style={groupStyles.modalHeader}>
                            <Text style={groupStyles.modalTitle}>Miembros del Grupo</Text>
                            <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {selectedGroup && (
                            <>
                                {/* Mostrar mensaje informativo para usuarios que no son administradores */}
                                {!selectedGroup.members.some(m => m.userId === user?.id && m.role === 'admin') && (
                                    <View style={groupStyles.infoMessage}>
                                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                                        <Text style={groupStyles.infoMessageText}>
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
                                            <View key={member.userId} style={groupStyles.memberItem}>
                                                <View style={groupStyles.memberInfo}>
                                                    <Text style={groupStyles.memberName}>{member.username}</Text>
                                                    {member.role === 'admin' && (
                                                        <View style={groupStyles.adminBadge}>
                                                            <Text style={[groupStyles.adminBadgeText, { color: isDarkMode ? colors.accent : colors.surface }]}>Admin</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {isCurrentUserAdmin && !isCurrentUser && (
                                                    <View style={groupStyles.memberActions}>
                                                        {member.role !== 'admin' && (
                                                            <TouchableOpacity
                                                                style={groupStyles.memberAction}
                                                                onPress={() => handleMakeAdmin(member.userId)}
                                                            >
                                                                <Ionicons name="shield-outline" size={18} color={colors.primary} />
                                                            </TouchableOpacity>
                                                        )}

                                                        <TouchableOpacity
                                                            style={groupStyles.memberAction}
                                                            onPress={() => handleRemoveMember(member.userId)}
                                                        >
                                                            <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
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
                <View style={groupStyles.modalOverlay}>
                    <View style={[groupStyles.modalContent, { maxHeight: '80%' }]}>
                        <View style={groupStyles.modalHeader}>
                            <Text style={groupStyles.modalTitle}>Invitar Amigos</Text>
                            <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {inviteLoading ? (
                            <ActivityIndicator size={24} color={colors.primary} style={{ padding: 20 }} />
                        ) : availableFriends.length > 0 ? (
                            <ScrollView style={{ width: '100%' }}>
                                {availableFriends.map((friend) => (
                                    <View key={friend.id} style={groupStyles.friendItem}>
                                        <Text style={groupStyles.friendName}>{friend.username}</Text>
                                        <TouchableOpacity
                                            style={groupStyles.inviteButton}
                                            onPress={() => handleInviteUser(friend.id)}
                                        >
                                            <Text style={groupStyles.inviteButtonText}>Invitar</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={groupStyles.emptyFriends}>
                                <Ionicons name="people-outline" size={50} color={colors.secondary} />
                                <Text style={groupStyles.emptyFriendsText}>
                                    No hay amigos disponibles para invitar. Todos tus amigos ya están en el grupo o han sido invitados.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

function getGroupStyles(colors, isDarkMode) {
    const { width } = Platform.OS === 'web' ? { width: 400 } : require('react-native').Dimensions.get('window');
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        },
        headerContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: isDarkMode ? '#181C22' : colors.primary,
            minHeight: Platform.OS === 'ios' ? 60 : 72,
            paddingTop: Platform.OS === 'ios' ? 8 : 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
        },
        backButton: {
            backgroundColor: isDarkMode ? colors.surface : colors.primary,
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode ? colors.accent : colors.surface,
            textAlign: 'center',
            flex: 1,
            marginHorizontal: 10,
        },
        headerRight: {
            width: 36,
        },
        invitationsContainer: {
            paddingTop: 16,
            paddingBottom: 8,
            backgroundColor: 'transparent',
            marginBottom: 8,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text.primary,
            marginBottom: 12,
            paddingHorizontal: 16,
        },
        invitationsList: {
            paddingLeft: 16,
        },
        invitationCard: {
            backgroundColor: isDarkMode ? '#232834' : colors.surface,
            borderRadius: 12,
            padding: 16,
            marginRight: 12,
            width: 280,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDarkMode ? colors.divider : colors.border,
        },
        invitationTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: isDarkMode ? colors.accent : colors.primary,
            marginBottom: 4,
        },
        invitationDescription: {
            fontSize: 14,
            color: colors.text.primary,
            marginBottom: 8,
        },
        invitationDetails: {
            fontSize: 14,
            color: colors.text.secondary,
            marginTop: 4,
        },
        invitationButtons: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 12,
        },
        invitationButton: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginLeft: 8,
        },
        acceptButton: {
            backgroundColor: colors.success,
        },
        rejectButton: {
            backgroundColor: colors.error,
        },
        buttonText: {
            color: colors.surface,
            fontWeight: '600',
            fontSize: 14,
        },
        groupsContainer: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        groupsList: {
            flex: 1,
        },
        groupsListContent: {
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16,
        },
        chatGroup: {
            flexDirection: 'row',
            backgroundColor: isDarkMode ? '#232834' : colors.surface,
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDarkMode ? colors.divider : colors.border,
        },
        groupAvatar: {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: isDarkMode ? colors.accent + '22' : colors.primary + '15',
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
            marginBottom: 6,
        },
        groupName: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text.primary,
            flex: 1,
            marginRight: 8,
        },
        settingsButton: {
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 16,
            backgroundColor: isDarkMode ? colors.surface : colors.background,
        },
        lastMessage: {
            fontSize: 14,
            color: colors.text.secondary,
            marginBottom: 8,
        },
        tripBadge: {
            flexDirection: 'row',
            backgroundColor: isDarkMode ? colors.primary : colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            alignItems: 'center',
            alignSelf: 'flex-start',
        },
        tripBadgeText: {
            color: colors.surface,
            fontSize: 12,
            marginLeft: 4,
            fontWeight: '500',
        },
        emptyContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text.primary,
            textAlign: 'center',
            marginTop: 16,
            marginBottom: 8,
        },
        emptySubtext: {
            fontSize: 14,
            color: colors.text.secondary,
            textAlign: 'center',
            paddingHorizontal: 32,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: 20,
            width: '80%',
            alignItems: 'center',
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 16,
            color: colors.text.primary,
        },
        input: {
            width: '100%',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 4,
            padding: 10,
            marginBottom: 16,
            color: colors.text.primary,
            backgroundColor: colors.surface,
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
            backgroundColor: colors.text.secondary,
        },
        confirmButton: {
            backgroundColor: colors.primary,
        },
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
            borderBottomColor: colors.divider,
            width: '100%',
        },
        memberInfo: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        memberName: {
            fontSize: 16,
            color: colors.text.primary,
        },
        adminBadge: {
            backgroundColor: isDarkMode ? colors.accent : colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
            marginLeft: 10,
        },
        adminBadgeText: {
            color: isDarkMode ? '#181C22' : colors.surface,
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
            borderBottomColor: colors.divider,
            width: '100%',
        },
        friendName: {
            fontSize: 16,
            color: colors.text.primary,
        },
        inviteButton: {
            backgroundColor: isDarkMode ? colors.accent : colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 4,
        },
        inviteButtonText: {
            color: isDarkMode ? '#181C22' : colors.surface,
            fontSize: 14,
        },
        emptyFriends: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        },
        emptyFriendsText: {
            textAlign: 'center',
            color: colors.text.secondary,
            marginTop: 10,
        },
        infoMessage: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? colors.accent + '22' : colors.primary + '10',
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            width: '100%',
        },
        infoMessageText: {
            fontSize: 14,
            color: colors.text.primary,
            marginLeft: 8,
            flex: 1,
        },
        optionsModalContent: {
            backgroundColor: colors.surface,
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
            borderBottomColor: colors.divider,
        },
        deleteOption: {
            borderBottomWidth: 0,
        },
        optionText: {
            fontSize: 16,
            marginLeft: 10,
            color: colors.text.primary,
        },
        deleteText: {
            color: colors.error,
        },
    });
}

export default GroupsScreen; 