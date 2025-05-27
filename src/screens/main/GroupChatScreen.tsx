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
                const updatedMessages = [...prev, newMsg];
                
                // Desplazar al final cuando llegue un nuevo mensaje
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
                
                return updatedMessages;
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
            
            // Crear mensaje temporal para actualización inmediata
            const tempMessage = {
                id: `temp_${Date.now()}`,
                group_id: groupId,
                sender_id: user.id,
                text: inputText.trim() || null,
                image_url: imageUrl,
                sender_username: user.username,
                created_at: new Date().toISOString(),
                read: false,
                isTemp: true // Marca para identificar que es temporal
            };
            
            // Actualizar UI inmediatamente con el mensaje temporal
            setMessages(prev => [...prev, tempMessage]);
            
            // Desplazar al final para mostrar el nuevo mensaje
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            // Enviar mensaje a la base de datos
            const sentMessage = await sendGroupMessage(
                groupId, 
                user.id, 
                inputText.trim() || null, 
                imageUrl, 
                user.username
            );
            
            // Reemplazar mensaje temporal con el real
            setMessages(prev => prev.map(msg => 
                msg.isTemp ? sentMessage : msg
            ));
            
            // Limpiar entrada
            setInputText('');
            setSelectedImage(null);
            setImagePreviewVisible(false);
        } catch (e) {
            console.error('Error al enviar mensaje:', e);
            Alert.alert('Error', 'No se pudo enviar el mensaje');
            
            // Eliminar mensaje temporal en caso de error
            setMessages(prev => prev.filter(msg => !msg.isTemp));
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMine = item.sender_id === user.id;
        return (
            <View style={[
                styles.messageContainer, 
                isMine ? styles.myMessage : styles.otherMessage,
                item.isTemp ? styles.tempMessage : {}
            ]}>
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
                        <Ionicons name="arrow-back" size={22} color={colors.secondary} />
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
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
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

const colors = {
    primary: '#003580',      // Azul oscuro (corporativo)
    secondary: '#0071c2',    // Azul brillante (para botones y acentos)
    background: '#ffffff',   // Blanco como fondo principal
    white: '#FFFFFF',        // Blanco neutro reutilizable
    text: {
      primary: '#00264d',    // Azul muy oscuro (para alta legibilidad)
      secondary: '#005b99',  // Azul medio (texto secundario)
      light: '#66a3ff',      // Azul claro (detalles decorativos o descripciones)
    },
    border: '#66b3ff',       // Azul claro (para bordes y separadores)
    success: '#38b000',      // Verde vibrante (indicadores positivos)
    error: '#e63946',        // Rojo vivo (errores y alertas)
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: Platform.OS === 'ios' ? 44 : 56,
        paddingTop: Platform.OS === 'ios' ? 0 : 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text.light,
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
        backgroundColor: colors.background,
    },
    myMessage: {
        alignSelf: 'flex-end',
        color: colors.primary,
        borderTopRightRadius: 4,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#F0F2F5',
        borderTopLeftRadius: 4,
    },
    sender: {
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        color: colors.text.primary,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 11,
        color: colors.text.primary,
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
        padding: 8,
        marginRight: 8,
        borderRadius: 20,
        borderColor: colors.border,
        borderWidth: 1,
        backgroundColor: colors.background,
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
    tempMessage: {
        opacity: 0.7,
    },
});

export default GroupChatScreen; 