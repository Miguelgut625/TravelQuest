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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#7F5AF0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{groupName}</Text>
            </View>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size={40} color="#7F5AF0" />
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
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons name="send" size={24} color="white" />
                    )}
                </TouchableOpacity>
            </View>
            <Modal
                visible={!!imagePreviewVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setImagePreviewVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.imagePreviewContainer}>
                        <Text style={styles.previewTitle}>Vista Previa</Text>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={{ width: 300, height: 300, borderRadius: 8 }}
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
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#181A20' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#2D2F3A',
        borderBottomWidth: 1,
        borderBottomColor: '#181A20',
    },
    backButton: { marginRight: 10, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5D90A', letterSpacing: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    messagesContainer: { padding: 10, paddingTop: 32 },
    messageContainer: { maxWidth: '80%', padding: 10, marginVertical: 5, borderRadius: 10 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#7F5AF0' },
    otherMessage: { alignSelf: 'flex-start', backgroundColor: '#232634' },
    sender: { fontSize: 12, color: '#F5D90A', fontWeight: 'bold' },
    messageText: { fontSize: 16, color: '#FFF' },
    messageTime: { fontSize: 12, color: '#A1A1AA', marginTop: 5, textAlign: 'right' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#232634', paddingHorizontal: 10, paddingVertical: 5 },
    input: { flex: 1, padding: 10, backgroundColor: '#393552', borderRadius: 20, maxHeight: 100, color: '#FFF' },
    sendButton: { marginLeft: 10, backgroundColor: '#2CB67D', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: '#393552' },
    attachButton: { marginRight: 10, padding: 4 },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    imagePreviewContainer: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        maxHeight: '80%',
    },
    previewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    previewButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    previewButton: { padding: 10, borderRadius: 5 },
    cancelButton: { backgroundColor: '#7F5AF0' },
    previewButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
});

export default GroupChatScreen; 