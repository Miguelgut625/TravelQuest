import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, Platform, Dimensions, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserJournalEntries, CityJournalEntry } from '../../services/journalService';
import { deleteFriendship, sendFriendRequest, cancelFriendRequest, getMutualFriends, getFriends } from '../../services/friendService';
import { getRankTitle, getRankTitleStyle } from '../../utils/rankUtils';
import { useNavigation, useRoute } from '@react-navigation/native';

interface JourneyMission {
    id: string;
    title: string;
    points: number;
    entries: {
        id: string;
        title: string;
        content: string;
        photos: string[];
        created_at: string;
    }[];
    completed: boolean;
    challenges: {
        points: number;
    };
}

interface Journey {
    id: string;
    cityId: string;
    cities: {
        name: string;
        country: string;
    };
    created_at: string;
    journeys_missions: {
        completed: boolean;
        challenges: {
            points: number;
        };
    }[];
}

interface FriendProfileScreenProps {
    route: {
        params: {
            friendId: string;
            friendName: string;
            rankIndex?: number;
        };
    };
}

const { width } = Dimensions.get('window');
const JOURNEY_IMAGE_WIDTH = width - 40; // 20 de padding en cada lado

const JournalEntryCard = ({ entry, friendId, commentsVisibility }: { 
    entry: CityJournalEntry, 
    friendId: string,
    commentsVisibility: 'public' | 'friends' | 'private'
}) => {
    const navigation = useNavigation<any>();
    
    const handleEntryPress = () => {
        navigation.navigate('JournalEntryDetail', { 
            entry: { 
                ...entry, 
                user_id: entry.userId || friendId,
                comments_visibility: commentsVisibility
            } 
        });
    };
    
    return (
        <TouchableOpacity style={styles.journalCard} onPress={handleEntryPress}>
            {entry.photos && entry.photos.length > 0 ? (
                <Image
                    source={{ uri: entry.photos[0] }}
                    style={styles.journalCardImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.journalCardNoImage}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                </View>
            )}
            <View style={styles.journalCardContent}>
                <View style={styles.journalCardHeader}>
                    <Text style={styles.journalCardTitle} numberOfLines={1}>{entry.title}</Text>
                    {entry.missionId && (
                        <View style={styles.journalMissionBadge}>
                            <Ionicons name="trophy" size={16} color="#4CAF50" />
                            <Text style={styles.journalMissionBadgeText}>Misión</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.journalCardDate}>
                    <Ionicons name="calendar-outline" size={14} color="#666" /> {new Date(entry.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.journalCardDescription} numberOfLines={2}>
                    {entry.content}
                </Text>
                {entry.tags && entry.tags.length > 0 && (
                    <View style={styles.journalTags}>
                        {entry.tags.slice(0, 3).map((tag, index) => (
                            <Text key={index} style={styles.journalTag}>
                                #{tag}
                            </Text>
                        ))}
                        {entry.tags.length > 3 && (
                            <Text style={styles.journalMoreTags}>+{entry.tags.length - 3}</Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <View style={styles.journalEmptyContainer}>
        <Ionicons name="journal-outline" size={64} color="#ccc" />
        <Text style={styles.journalEmptyText}>{message}</Text>
    </View>
);

const FriendProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { friendId, friendName: initialFriendName, rankIndex } = route.params as { friendId: string; friendName: string; rankIndex?: number };
    const user = useSelector((state: RootState) => state.auth.user);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFriend, setIsFriend] = useState(false);
    const [friendshipDate, setFriendshipDate] = useState<string | null>(null);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [localRankIndex, setLocalRankIndex] = useState<number | undefined>(rankIndex);
    const [displayName, setDisplayName] = useState(initialFriendName);
    const [friendPoints, setFriendPoints] = useState(0);
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
    const [level, setLevel] = useState(1);
    const [xp, setXp] = useState(0);
    const [xpNext, setXpNext] = useState(50);
    const [stats, setStats] = useState({
        totalPoints: 0,
        completedMissions: 0,
        visitedCities: 0
    });
    const [entriesByCity, setEntriesByCity] = useState<{ [cityName: string]: CityJournalEntry[] }>({});
    const [customTitle, setCustomTitle] = useState<string | null>(null);
    const [friendshipChecked, setFriendshipChecked] = useState(false);
    const [mutualFriends, setMutualFriends] = useState<any[]>([]);
    const [loadingMutualFriends, setLoadingMutualFriends] = useState(false);
    const [friendsList, setFriendsList] = useState<any[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [friendsCount, setFriendsCount] = useState(0);
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [myPendingRequests, setMyPendingRequests] = useState<string[]>([]);
    const [friendsVisibility, setFriendsVisibility] = useState<'public' | 'friends' | 'private'>('public');
    const [commentsVisibility, setCommentsVisibility] = useState<'public' | 'friends' | 'private'>('public');

    useEffect(() => {
        console.log('FriendProfileScreen - useEffect triggered');
        console.log('Current user:', user?.id);
        console.log('Friend ID:', friendId);
        setFriendshipChecked(false);
        checkFriendshipStatus();
        checkPendingRequest();
        fetchMutualFriends();
        fetchFriendsList();
        fetchMyFriendsAndRequests();
        // Si no viene el rankIndex por navegación, lo calculamos consultando el leaderboard
        const fetchRankIndex = async () => {
            if (rankIndex === undefined && friendId) {
                const { data, error } = await supabase
                    .from('users')
                    .select('id')
                    .order('points', { ascending: false });
                if (!error && data) {
                    const index = data.findIndex((user: any) => user.id === friendId);
                    if (index !== -1) {
                        setLocalRankIndex(index);
                    }
                }
            } else if (rankIndex !== undefined) {
                setLocalRankIndex(rankIndex);
            }
        };
        fetchRankIndex();
    }, [friendId, user?.id, rankIndex]);

    useEffect(() => {
        if (user && friendId && friendshipChecked) {
            fetchFriendData();
        }
    }, [isFriend, friendId, user?.id, friendshipChecked]);

    const fetchFriendData = async () => {
        if (!user || !friendId) return;

        try {
            setLoading(true);
            setError(null);

            // Obtener los puntos, nivel, XP y privacidad del amigo
            const { data: friendData, error: friendError } = await supabase
                .from('users')
                .select('points, level, xp, xp_next, username, profile_pic_url, profile_visibility, custom_title, friends_visibility, comments_visibility')
                .eq('id', friendId)
                .single();

            if (friendError) throw friendError;

            // Comprobar privacidad del perfil
            const canViewProfile =
                friendData.profile_visibility === 'public' ||
                (friendData.profile_visibility === 'friends' && isFriend) ||
                (friendData.profile_visibility === 'private' && user?.id === friendId);

            if (!canViewProfile) {
                setError('No tienes permiso para ver este perfil');
                setLoading(false);
                return;
            }

            setDisplayName(friendData.username);
            setFriendPoints(friendData.points);
            setLevel(friendData.level || 1);
            setXp(friendData.xp || 0);
            setXpNext(friendData.xp_next || 50);
            setProfilePicUrl(friendData.profile_pic_url || null);
            setCustomTitle(friendData.custom_title || null);
            setFriendsVisibility(friendData.friends_visibility || 'public');
            setCommentsVisibility(friendData.comments_visibility || 'public');

            // Obtener las ciudades visitadas del amigo desde journeys
            const { data: journeys, error: journeysError } = await supabase
                .from('journeys')
                .select('cityId')
                .eq('userId', friendId);
            if (journeysError) throw journeysError;
            const uniqueCities = new Set((journeys || []).map((j: any) => j.cityId)).size;

            // Obtener las entradas del diario del amigo
            const entries = await getUserJournalEntries(friendId);
            setEntriesByCity(entries);

            // Calcular estadísticas
            const cities = Object.keys(entries);
            let completedMissions = 0;
            cities.forEach(city => {
                completedMissions += entries[city].filter((e: CityJournalEntry) => e.missionId).length;
            });

            setStats({
                totalPoints: friendData.points || 0,
                completedMissions,
                visitedCities: uniqueCities
            });

        } catch (error) {
            console.error('Error fetching friend data:', error);
            setError('No se pudieron cargar los datos del perfil');
        } finally {
            setLoading(false);
        }
    };

    const checkFriendshipStatus = async () => {
        if (!user || !friendId) {
            console.log('checkFriendshipStatus - Missing user or friendId');
            setFriendshipChecked(true);
            return;
        }
        try {
            console.log('Checking friendship between:', user.id, 'and', friendId);
            // Verificar si existe una relación de amistad en cualquier dirección
            const { data: friendshipData, error: friendshipError } = await supabase
                .from('friends')
                .select('created_at')
                .or(`and(user1Id.eq.${user.id},user2Id.eq.${friendId}),and(user1Id.eq.${friendId},user2Id.eq.${user.id})`);

            console.log('Friendship check result:', { friendshipData, friendshipError });

            if (!friendshipError && friendshipData && friendshipData.length > 0) {
                console.log('Setting isFriend to true');
                setIsFriend(true);
                setFriendshipDate(friendshipData[0].created_at);
            } else {
                console.log('Setting isFriend to false');
                setIsFriend(false);
                setFriendshipDate(null);
            }
        } catch (e) {
            console.error('Error checking friendship status:', e);
            setIsFriend(false);
            setFriendshipDate(null);
        } finally {
            setFriendshipChecked(true);
        }
    };

    const checkPendingRequest = async () => {
        if (!user || !friendId) return;
        try {
            console.log('Checking pending requests for:', { userId: user.id, friendId });

            // Verificar solicitudes enviadas
            const { data: sentRequest, error: sentError } = await supabase
                .from('friendship_invitations')
                .select('id')
                .eq('senderId', user.id)
                .eq('receiverId', friendId)
                .eq('status', 'Pending')
                .maybeSingle();

            // Verificar solicitudes recibidas
            const { data: receivedRequest, error: receivedError } = await supabase
                .from('friendship_invitations')
                .select('id')
                .eq('senderId', friendId)
                .eq('receiverId', user.id)
                .eq('status', 'Pending')
                .maybeSingle();

            console.log('Request check results:', { sentRequest, receivedRequest });

            const hasPending = (!sentError && sentRequest) || (!receivedError && receivedRequest);
            console.log('Setting hasPendingRequest to:', hasPending);
            setHasPendingRequest(hasPending);
        } catch (error) {
            console.error('Error checking pending request:', error);
            setHasPendingRequest(false);
        }
    };

    const handleAddFriend = async () => {
        if (!user) return;
        try {
            const { success, error } = await sendFriendRequest(user.id, friendId);
            if (success) {
                Alert.alert('Éxito', 'Solicitud de amistad enviada');
                await checkPendingRequest();
                navigation.goBack();
            } else {
                Alert.alert('Error', error || 'No se pudo enviar la solicitud de amistad');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo enviar la solicitud de amistad');
        }
    };

    const handleDeleteFriendship = async () => {
        if (!user) return;
        Alert.alert(
            'Eliminar amistad',
            '¿Estás seguro de que quieres eliminar esta amistad?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { success, error } = await deleteFriendship(user.id, friendId);
                            if (success) {
                                Alert.alert('Éxito', 'Amistad eliminada correctamente');
                                navigation.goBack();
                            } else {
                                throw error;
                            }
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar la amistad');
                        }
                    },
                },
            ]
        );
    };

    const handleCancelRequest = async () => {
        if (!user) return;
        try {
            const { success, error } = await cancelFriendRequest(user.id, friendId);
            if (success) {
                Alert.alert('Éxito', 'Solicitud de amistad cancelada');
                await checkPendingRequest();
                navigation.goBack();
            } else {
                Alert.alert('Error', error || 'No se pudo cancelar la solicitud de amistad');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo cancelar la solicitud de amistad');
        }
    };

    const renderActionIcon = () => {
        console.log('Rendering icon with states:', { isFriend, hasPendingRequest });
        let iconName = "person-add";
        let iconColor = "#005F9E";
        let onPressAction = handleAddFriend;

        if (isFriend) {
            iconName = "person-remove";
            iconColor = "#ff4444";
            onPressAction = handleDeleteFriendship;
        } else if (hasPendingRequest) {
            iconName = "close-circle";
            iconColor = "#FFA000";
            onPressAction = handleCancelRequest;
        }

        return (
            <TouchableOpacity
                style={styles.actionIconProfile}
                onPress={onPressAction}
            >
                <Ionicons
                    name={iconName}
                    size={22}
                    color={iconColor}
                />
            </TouchableOpacity>
        );
    };

    const fetchMutualFriends = async () => {
        if (!user || !friendId) return;

        try {
            setLoadingMutualFriends(true);
            const mutualFriendsList = await getMutualFriends(user.id, friendId);
            setMutualFriends(mutualFriendsList);
        } catch (error) {
            console.error('Error al obtener amigos en común:', error);
        } finally {
            setLoadingMutualFriends(false);
        }
    };

    const fetchFriendsList = async () => {
        setLoadingFriends(true);
        try {
            const list = await getFriends(friendId);
            setFriendsList(list);
            setFriendsCount(list.length);
        } catch (e) {
            setFriendsList([]);
            setFriendsCount(0);
        } finally {
            setLoadingFriends(false);
        }
    };

    // Obtener amigos y solicitudes pendientes del usuario actual
    const fetchMyFriendsAndRequests = async () => {
        if (!user?.id) return;
        try {
            const friends = await getFriends(user.id);
            setMyFriends(friends);
            // Obtener solicitudes pendientes enviadas
            const { data: sentRequests, error: sentError } = await supabase
                .from('friendship_invitations')
                .select('receiverId')
                .eq('senderId', user.id)
                .eq('status', 'Pending');
            if (!sentError && sentRequests) {
                setMyPendingRequests(sentRequests.map((req: any) => req.receiverId));
            } else {
                setMyPendingRequests([]);
            }
        } catch (e) {
            setMyFriends([]);
            setMyPendingRequests([]);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size={40} color="#005F9E" />
            </View>
        );
    }

    if (error === 'No tienes permiso para ver este perfil') {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.privateContainer}>
                    <Ionicons name="lock-closed" size={80} color="#ccc" style={{ marginBottom: 20 }} />
                    <Text style={styles.privateTitle}>Perfil privado</Text>
                    <Text style={styles.privateText}>Este usuario ha configurado su perfil como privado. No tienes permiso para ver su información.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView>
                <View style={styles.headerBackground}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Perfil de {displayName}</Text>
                    </View>
                </View>

                <View style={styles.profileSection}>
                    {renderActionIcon()}
                    {profilePicUrl ? (
                        <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
                        </View>
                    )}
                    <Text style={styles.username}>{displayName}</Text>
                    {customTitle && (
                        <Text style={styles.customTitle}>{customTitle}</Text>
                    )}
                    {localRankIndex !== undefined && (
                        <Text style={getRankTitleStyle(localRankIndex)}>{getRankTitle(localRankIndex)}</Text>
                    )}
                    <View style={styles.levelContainer}>
                        <Text style={styles.levelText}>Nivel {level}</Text>
                        <View style={styles.xpBar}>
                            <View
                                style={[
                                    styles.xpProgress,
                                    { width: `${(xp / xpNext) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.xpText}>{xp}/{xpNext} XP</Text>
                    </View>
                    <Text style={styles.points}>Puntos: {friendPoints}</Text>
                    {friendshipDate && (
                        <Text style={styles.friendshipDate}>
                            Amigos desde: {new Date(friendshipDate).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </Text>
                    )}
                    {/* Estadística de amigos */}
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' }} onPress={() => setShowFriendsModal(true)}>
                        <Ionicons name="people" size={20} color="#005F9E" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 16, color: '#005F9E', fontWeight: 'bold' }}>{friendsCount} Amigos</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsSection}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.completedMissions}</Text>
                        <Text style={styles.statLabel}>Misiones Completadas</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.visitedCities}</Text>
                        <Text style={styles.statLabel}>Ciudades Visitadas</Text>
                    </View>
                </View>

                {/* Modal de amigos */}
                <Modal
                    visible={showFriendsModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowFriendsModal(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 10, width: '90%', maxHeight: '80%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Amigos de {displayName}</Text>
                                <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                                    <Ionicons name="close" size={28} color="#005F9E" />
                                </TouchableOpacity>
                            </View>
                            {(() => {
                                // Lógica de visibilidad de amigos
                                if (friendsVisibility === 'private' && user?.id !== friendId) {
                                    return <Text style={{ textAlign: 'center', margin: 20, color: '#666' }}>Este usuario prefiere no mostrar su lista de amigos.</Text>;
                                }
                                if (friendsVisibility === 'friends' && !isFriend && user?.id !== friendId) {
                                    return <Text style={{ textAlign: 'center', margin: 20, color: '#666' }}>Solo los amigos pueden ver la lista de amigos de este usuario.</Text>;
                                }
                                if (loadingFriends) {
                                    return <ActivityIndicator size="large" color="#005F9E" style={{ margin: 20 }} />;
                                }
                                if (friendsList.length === 0) {
                                    return <Text style={{ textAlign: 'center', margin: 20, color: '#666' }}>No tiene amigos aún.</Text>;
                                }
                                return (
                                    <FlatList
                                        data={friendsList}
                                        keyExtractor={item => item.user2Id}
                                        renderItem={({ item }) => {
                                            const isMyFriend = myFriends.some(f => f.user2Id === item.user2Id);
                                            const hasPending = myPendingRequests.includes(item.user2Id);
                                            return (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                                                        setShowFriendsModal(false);
                                                        navigation.navigate('FriendProfile', {
                                                            friendId: item.user2Id,
                                                            friendName: item.username,
                                                            rankIndex: item.rankIndex
                                                        });
                                                    }}>
                                                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.username}</Text>
                                                        <Text style={{ color: '#666' }}>{item.points} puntos</Text>
                                                    </TouchableOpacity>
                                                    {item.user2Id === user.id ? (
                                                        <Text style={{ color: '#005F9E', fontWeight: 'bold', marginLeft: 10 }}>Tú</Text>
                                                    ) : !isMyFriend && !hasPending ? (
                                                        <TouchableOpacity
                                                            style={{ backgroundColor: '#005F9E', borderRadius: 20, padding: 8, marginLeft: 10 }}
                                                            onPress={async () => {
                                                                await sendFriendRequest(user.id, item.user2Id);
                                                                fetchFriendsList();
                                                            }}
                                                        >
                                                            <Ionicons name="person-add-outline" size={20} color="white" />
                                                        </TouchableOpacity>
                                                    ) : hasPending ? (
                                                        <Ionicons name="time-outline" size={20} color="#FFA000" style={{ marginLeft: 10 }} />
                                                    ) : isMyFriend ? (
                                                        <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" style={{ marginLeft: 10 }} />
                                                    ) : null}
                                                </View>
                                            );
                                        }}
                                    />
                                );
                            })()}
                        </View>
                    </View>
                </Modal>

                {isFriend && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Amigos en Común</Text>
                        {loadingMutualFriends ? (
                            <ActivityIndicator size="small" color="#005F9E" />
                        ) : mutualFriends.length > 0 ? (
                            <FlatList
                                data={mutualFriends}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.user2Id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.mutualFriendItem}
                                        onPress={() => navigation.navigate('FriendProfile', {
                                            friendId: item.user2Id,
                                            friendName: item.username
                                        })}
                                    >
                                        {item.profilePicUrl ? (
                                            <Image source={{ uri: item.profilePicUrl }} style={styles.mutualFriendAvatar} />
                                        ) : (
                                            <View style={[styles.mutualFriendAvatar, styles.mutualFriendAvatarPlaceholder]}>
                                                <Text style={styles.mutualFriendAvatarText}>{item.username.charAt(0)}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.mutualFriendName} numberOfLines={1}>{item.username}</Text>
                                        <Text style={styles.mutualFriendPoints}>{item.points} pts</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <Text style={styles.emptyText}>No tienen amigos en común</Text>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Últimos Viajes</Text>
                    {!isFriend ? (
                        <View style={styles.journalEmptyContainer}>
                            <Ionicons name="lock-closed" size={64} color="#ccc" />
                            <Text style={styles.journalEmptyText}>
                                No puedes ver los viajes de {displayName} hasta que sean amigos
                            </Text>
                        </View>
                    ) : Object.values(entriesByCity).length === 0 ? (
                        <Text style={styles.emptyText}>No hay viajes completados</Text>
                    ) : (
                        Object.values(entriesByCity).map((cityEntries, index) => (
                            <JournalEntryCard 
                                key={index}
                                entry={cityEntries[0]}
                                friendId={friendId}
                                commentsVisibility={commentsVisibility}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
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
    headerBackground: {
        backgroundColor: '#005F9E',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginRight: 6,
    },
    profileSection: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        marginBottom: 10,
        position: 'relative',
    },
    actionIconProfile: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        backgroundColor: '#90CAF9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: 'white',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    levelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    levelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 10,
    },
    xpBar: {
        height: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 5,
        flex: 1,
    },
    xpProgress: {
        height: '100%',
        backgroundColor: '#005F9E',
        borderRadius: 5,
    },
    xpText: {
        fontSize: 14,
        color: '#666',
    },
    points: {
        fontSize: 16,
        color: '#666',
    },
    statsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        backgroundColor: 'white',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#005F9E',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    section: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    journeyItem: {
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    journeyImagesContainer: {
        height: 200,
        width: '100%',
    },
    journeyImage: {
        width: '100%',
        height: 200,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    noImageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    journeyContent: {
        padding: 15,
    },
    journeyCity: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    journeyDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    journeyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    journeyDate: {
        fontSize: 12,
        color: '#999',
    },
    pointsContainer: {
        backgroundColor: '#005F9E',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointsText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 4,
    },
    pointsLabel: {
        color: 'white',
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        marginVertical: 20,
    },
    journalCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    journalCardImage: {
        width: '100%',
        height: 180,
    },
    journalCardNoImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    journalCardContent: {
        padding: 16,
    },
    journalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    journalCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    journalMissionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    journalMissionBadgeText: {
        fontSize: 12,
        color: '#4CAF50',
        marginLeft: 4,
        fontWeight: '600',
    },
    journalCardDate: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    journalCardDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    journalTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    journalTag: {
        fontSize: 12,
        color: '#005F9E',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
    },
    journalMoreTags: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    friendshipDate: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    firstPlaceText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    secondPlaceText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#C0C0C0',
    },
    thirdPlaceText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#CD7F32',
    },
    titleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    privateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    privateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    privateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    customTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7F5AF0',
        marginBottom: 2,
        textAlign: 'center',
    },
    mutualFriendItem: {
        marginRight: 10,
        alignItems: 'center',
    },
    mutualFriendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 5,
    },
    mutualFriendAvatarPlaceholder: {
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mutualFriendAvatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#666',
    },
    mutualFriendName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    mutualFriendPoints: {
        fontSize: 14,
        color: '#666',
    },
});

export default FriendProfileScreen; 