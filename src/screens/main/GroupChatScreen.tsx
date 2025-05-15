// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
    Modal,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import {
    getGroupMessages,
    sendGroupMessage,
    subscribeToGroupMessages,
    markGroupMessagesAsRead
} from '../../services/messageService';
import { getGroupById } from '../../services/groupService';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

const GroupChatScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { groupId } = route.params;
    const user = useSelector((state: RootState) => state.auth.user);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [groupName, setGroupName] = useState('Grupo');
    const flatListRef = useRef(null);
    const subscriptionRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

    useEffect(() => {
        fetchGroupInfo();
        loadMessages();
        setupSubscription();
        return () => {
            if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        };
    }, [groupId]);

    const fetchGroupInfo = async () => {
        try {
            const group = await getGroupById(groupId);
            if (group && group.name) setGroupName(group.name);
        } catch (e) { }
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const msgs = await getGroupMessages(groupId);
            setMessages(msgs);
            await markGroupMessagesAsRead(groupId, user.id);
        } catch (e) {
            Alert.alert('Error', 'No se pudieron cargar los mensajes del grupo');
        } finally {
            setLoading(false);
        }
    };

    const setupSubscription = () => {
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        subscriptionRef.current = subscribeToGroupMessages(groupId, (newMsg) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || sending) return;
        setSending(true);
        try {
            let imageUrl = null;
            if (selectedImage) {
                imageUrl = await uploadImageToCloudinary(selectedImage, `group_${groupId}_${user.id}_${Date.now()}`);
            }
            await sendGroupMessage(groupId, user.id, inputText.trim() || null, imageUrl, user.username);
            setInputText('');
            setSelectedImage(null);
            setImagePreviewVisible(false);
        } catch (e) {
            Alert.alert('Error', 'No se pudo enviar el mensaje');
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMine = item.sender_id === user.id;
        return (
            <View style={[styles.messageContainer, isMine ? styles.myMessage : styles.otherMessage]}>
                <Text style={styles.sender}>{item.sender_username || 'Usuario'}</Text>
                {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
                {item.image_url ? (
                    <TouchableOpacity onPress={() => setImagePreviewVisible(item.image_url)}>
                        <Image source={{ uri: item.image_url }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 5 }} resizeMode="cover" />
                    </TouchableOpacity>
                ) : null}
                <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#005F9E" />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#005F9E" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
                    <View style={styles.headerRight} />
                </View>

                {/* Mensajes */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size={40} color="#005F9E" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesContainer}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                {/* Input Container */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                quality: 0.7,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                setSelectedImage(result.assets[0].uri);
                                setImagePreviewVisible(true);
                            }
                        }}
                    >
                        <Ionicons name="image-outline" size={24} color="#005F9E" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor="#A0A0A0"
                        multiline
                        maxHeight={100}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() && !selectedImage || sending) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && !selectedImage) || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="send" size={22} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Modal de vista previa de imagen */}
                <Modal
                    visible={!!imagePreviewVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setImagePreviewVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.imagePreviewContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.previewTitle}>Vista Previa</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setImagePreviewVisible(false);
                                        setSelectedImage(null);
                                    }}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
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
                                    style={[styles.previewButton, styles.confirmButton]}
                                    onPress={handleSend}
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#005F9E',
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#005F9E',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: Platform.OS === 'ios' ? 44 : 56,
        paddingTop: Platform.OS === 'ios' ? 0 : 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        backgroundColor: '#FFFFFF',
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
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerRight: {
        width: 36,
        height: 36,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    messageContainer: {
        maxWidth: '80%',
        padding: 12,
        marginVertical: 4,
        borderRadius: 16,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#005F9E',
        borderTopRightRadius: 4,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#F0F2F5',
        borderTopLeftRadius: 4,
    },
    sender: {
        fontSize: 12,
        color: '#7F5AF0',
        fontWeight: '600',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        textAlign: 'right',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    input: {
        flex: 1,
        marginHorizontal: 8,
        padding: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        fontSize: 15,
        color: '#333',
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#005F9E',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#CCC',
    },
    attachButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewContainer: {
        backgroundColor: '#FFF',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 8,
        marginBottom: 16,
    },
    previewButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    cancelButton: {
        backgroundColor: '#F0F2F5',
    },
    confirmButton: {
        backgroundColor: '#005F9E',
    },
    previewButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});

export default GroupChatScreen; 