// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, Dimensions, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import {
  addPhotoToEntry,
  getJournalEntryById,
  getCommentsByEntryId,
  addCommentToEntryTable
} from '../../services/journalService';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../context/ThemeContext';
import { typography, shadows } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface JournalEntryDetailScreenProps {
  route: RouteProp<{ JournalEntryDetail: { entry: any } }, 'JournalEntryDetail'>;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  username?: string;
  profile_pic_url?: string;
}

const EntryHeader = ({ title, onBack, styles, titleColor, isDarkMode, colors }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#fff'} />
    </TouchableOpacity>
    <Text style={[styles.headerTitle, { color: titleColor, flex: 1 }]} numberOfLines={1}>{title}</Text>
  </View>
);

const JournalEntryDetailScreen = ({ route }: JournalEntryDetailScreenProps) => {
  const { entry } = route.params;
  const navigation = useNavigation();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsVisibility, setCommentsVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [isFriend, setIsFriend] = useState(false);
  const [checkingFriendship, setCheckingFriendship] = useState(true);
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, isDarkMode, insets);

  const isOwner = user && entry && user.id === entry.user_id;

  useEffect(() => {
    const fetchAuthorCommentsVisibility = async (authorId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('comments_visibility')
          .eq('id', authorId)
          .single();
        if (!error && data) {
          setCommentsVisibility(data.comments_visibility || 'public');
        } else {
          setCommentsVisibility('public');
        }
      } catch (error) {
        setCommentsVisibility('public');
        console.error('Error al obtener privacidad de comentarios:', error);
      }
    };
    if (entry?.user_id) {
      fetchAuthorCommentsVisibility(entry.user_id);
    }
  }, [entry]);

  useEffect(() => {
    const checkFriendship = async () => {
      setCheckingFriendship(true);
      if (!user || !entry?.user_id || user.id === entry.user_id) {
        setIsFriend(false);
        setCheckingFriendship(false);
        return;
      }
      try {
        // Primero verificar si el usuario actual es user1Id
        const { data: user1Data, error: user1Error } = await supabase
          .from('friends')
          .select('id')
          .eq('user1Id', user.id)
          .eq('user2Id', entry.user_id)
          .single();

        if (user1Error && user1Error.code !== 'PGRST116') {
          console.error('Error al verificar amistad (user1):', user1Error);
        }

        // Luego verificar si el usuario actual es user2Id
        const { data: user2Data, error: user2Error } = await supabase
          .from('friends')
          .select('id')
          .eq('user1Id', entry.user_id)
          .eq('user2Id', user.id)
          .single();

        if (user2Error && user2Error.code !== 'PGRST116') {
          console.error('Error al verificar amistad (user2):', user2Error);
        }

        // Si cualquiera de las dos consultas devuelve datos, son amigos
        setIsFriend(!!user1Data || !!user2Data);

        console.log('Estado de amistad:', {
          user1Data,
          user2Data,
          isFriend: !!user1Data || !!user2Data
        });
      } catch (error) {
        console.error('Error al verificar amistad:', error);
        setIsFriend(false);
      } finally {
        setCheckingFriendship(false);
      }
    };
    checkFriendship();
  }, [user, entry]);

  useEffect(() => {
    if (entry?.comments_visibility) {
      setCommentsVisibility(entry.comments_visibility);
    }
  }, [entry]);

  const canComment = () => {
    if (!user) return false;
    if (isOwner) return true;

    switch (commentsVisibility) {
      case 'public':
        return true;
      case 'friends':
        return isFriend;
      case 'private':
        return false;
      default:
        return false;
    }
  };

  // Determinar si la entrada pertenece al usuario actual
  const isMyEntry = entry.userId === user?.id || entry.user_id === user?.id || entry.userid === user?.id;

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('journal_comments')
        .select(`
          id,
          user_id,
          comment,
          created_at,
          users:user_id (
            username,
            profile_pic_url
          )
        `)
        .eq('entry_id', entry.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = commentsData.map(comment => ({
        id: comment.id,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at,
        username: comment.users?.username,
        profile_pic_url: comment.users?.profile_pic_url
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCommentDate = (dateString) => {
    // Intentar parsear como ISO
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    // Intentar parsear formato dd/mm/yyyy hh:mm:ss a. m./p. m.
    const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (a\. m\.|p\. m\.)/);
    if (match) {
      let [_, d, m, y, h, min, s, ap] = match;
      d = parseInt(d, 10);
      m = parseInt(m, 10) - 1;
      y = parseInt(y, 10);
      h = parseInt(h, 10);
      min = parseInt(min, 10);
      s = parseInt(s, 10);
      if (ap === 'p. m.' && h < 12) h += 12;
      if (ap === 'a. m.' && h === 12) h = 0;
      date = new Date(y, m, d, h, min, s);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'Sin fecha';
  };

  const goToNextPhoto = () => {
    if (entry.photos && currentPhotoIndex < entry.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const goToPrevPhoto = () => {
    if (entry.photos && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleAddPhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos permisos para acceder a tu galería.');
        return;
      }

      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIsAddingPhoto(true);
        const imageUri = result.assets[0].uri;

        // Subir imagen a Cloudinary
        const cloudinaryUrl = await uploadImageToCloudinary(imageUri, `journal_${entry.id}`);

        // Añadir URL a la entrada
        const success = await addPhotoToEntry(entry.id, cloudinaryUrl);

        if (success) {
          // Actualizar la entrada local
          entry.photos = [...(entry.photos || []), cloudinaryUrl];

          // Navegar a la última foto añadida
          setCurrentPhotoIndex(entry.photos.length - 1);

          Alert.alert('Éxito', 'Imagen añadida correctamente');
        } else {
          Alert.alert('Error', 'No se pudo añadir la imagen');
        }
      }
    } catch (error) {
      console.error('Error al añadir foto:', error);
      Alert.alert('Error', 'Ocurrió un error al añadir la foto');
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handleAddComment = async () => {
    if (!canComment()) {
      Alert.alert('No tienes permiso para comentar en esta entrada.');
      return;
    }
    if (!newComment.trim()) return;
    try {
      setIsAddingComment(true);
      if (!user || !user.id) {
        Alert.alert('Error', 'Debes iniciar sesión para comentar');
        return;
      }
      const success = await addCommentToEntryTable(entry.id, user.id, newComment);
      if (success) {
        setNewComment('');
        // Refrescar los comentarios inmediatamente después de añadir uno nuevo
        await fetchComments();
      } else {
        Alert.alert('Error', 'No se pudo guardar el comentario');
      }
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      Alert.alert('Error', 'Ocurrió un error al añadir el comentario');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Asegurarnos de que los comentarios se cargan al montar el componente
  useEffect(() => {
    fetchComments();
  }, [entry.id]); // Solo se ejecuta cuando cambia el ID de la entrada

  // Eliminar la lógica antigua de extraer comentarios del contenido
  const refreshEntry = async () => {
    try {
      setRefreshing(true);
      const updatedEntry = await getJournalEntryById(entry.id);
      if (updatedEntry) {
        route.params.entry = updatedEntry;
        // Solo refrescar los comentarios
        await fetchComments();
      }
    } catch (error) {
      console.error('Error al refrescar la entrada:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 32 }}>PRUEBA DE RENDER DIRECTO</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSafeArea}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: isDarkMode ? colors.accent : colors.primary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }
            ]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#181C22' : '#fff'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? colors.accent : colors.surface, textAlign: 'center', marginLeft: 12 }]}
            numberOfLines={1}
          >
            {entry.title}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 0 }}>
        <Text style={[styles.dateText, { color: isDarkMode ? colors.accent : colors.primary }]}>{formatDate(entry.created_at)}</Text>
        {/* Imagen principal */}
        <View style={styles.photoContainer}>
          {entry.photos && entry.photos.length > 0 ? (
            <>
              <Image
                source={{ uri: entry.photos[currentPhotoIndex] }}
                style={[styles.mainPhoto, { width: Dimensions.get('window').width - 32 }]}
                resizeMode="cover"
              />

              {/* Indicadores de foto (dots) */}
              {entry.photos.length > 1 && (
                <View style={styles.photoDots}>
                  {entry.photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentPhotoIndex && styles.activeDot
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Botones para navegar entre fotos */}
              {entry.photos.length > 1 && (
                <View style={styles.photoNavButtons}>
                  <TouchableOpacity
                    onPress={goToPrevPhoto}
                    style={[styles.photoNavButton, styles.prevButton]}
                    disabled={currentPhotoIndex === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color="white"
                      style={{ opacity: currentPhotoIndex === 0 ? 0.5 : 1 }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={goToNextPhoto}
                    style={[styles.photoNavButton, styles.nextButton]}
                    disabled={currentPhotoIndex === entry.photos.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color="white"
                      style={{ opacity: currentPhotoIndex === entry.photos.length - 1 ? 0.5 : 1 }}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <Text style={styles.noPhotoText}>Sin imágenes</Text>
            </View>
          )}
        </View>
        {/* Botón añadir imagen */}
        {isMyEntry && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto} disabled={isAddingPhoto}>
            {isAddingPhoto ? (
              <ActivityIndicator size="small" color={isDarkMode ? colors.background : colors.surface} />
            ) : (
              <>
                <Ionicons name="add" size={24} color={isDarkMode ? colors.background : colors.surface} />
                <Text style={styles.addPhotoText}>Añadir imagen</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {/* Card de contenido */}
        <View style={styles.contentCard}>
          <Text style={[styles.content, { color: colors.text.primary }]}>
            {entry.content.split('\n').map((paragraph, index) => (
              <React.Fragment key={index}>
                {paragraph.trim() !== '' && (
                  <Text>
                    {paragraph}
                    {index < entry.content.split('\n').length - 1 && '\n\n'}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </Text>
        </View>
        {/* Etiquetas */}
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
        {/* Comentarios */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsSectionTitle}>Comentarios</Text>
          {checkingFriendship ? (
            <ActivityIndicator size="small" color="#005F9E" style={{ marginVertical: 10 }} />
          ) : !canComment() ? (
            <Text style={styles.noCommentsText}>
              {commentsVisibility === 'private'
                ? 'El autor ha configurado esta entrada para que nadie pueda comentar.'
                : commentsVisibility === 'friends'
                  ? 'Solo los amigos pueden comentar en esta entrada.'
                  : 'No tienes permiso para comentar en esta entrada.'}
            </Text>
          ) : null}
          {comments.length > 0 ? (
            <ScrollView style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthorContainer}>
                      {/* Avatar y nombre */}
                      <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>{comment.username || 'Usuario'}</Text>
                    </View>
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 8 }}>{formatCommentDate(comment.created_at)}</Text>
                  </View>
                  <Text style={{ color: colors.text.primary }}>{comment.comment}</Text>
                </View>
              ))}
            </ScrollView>
          ) : canComment() ? (
            <Text style={styles.noCommentsText}>
              No hay comentarios aún. ¡Sé el primero en comentar!
            </Text>
          ) : null}

          {/* Input de comentario */}
          {canComment() && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 16,
                  marginRight: 8,
                }}
                placeholder="Escribe un comentario..."
                placeholderTextColor={isDarkMode ? colors.text.secondary : '#888'}
                value={newComment}
                onChangeText={setNewComment}
                editable={!isAddingComment}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: isDarkMode ? colors.accent : colors.primary,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleAddComment}
                disabled={isAddingComment || !newComment.trim()}
              >
                <Ionicons name="arrow-forward" size={24} color={isDarkMode ? '#181C22' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (colors, isDarkMode, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : colors.surface,
  },
  headerSafeArea: {
    backgroundColor: isDarkMode ? colors.background : colors.primary,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: (insets?.top || 0) + 24,
  },
  headerTitle: {
    ...typography.h2,
    color: isDarkMode ? colors.accent : colors.surface,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
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
  scrollContent: {
    padding: 0,
  },
  dateText: {
    color: isDarkMode ? colors.accent : colors.primary,
    ...typography.small,
    marginBottom: 8,
    marginLeft: 24,
    marginTop: 8,
  },
  photoContainer: {
    width: '92%',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  mainPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 20,
  },
  photoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.surface,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  photoNavButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    marginLeft: 10,
  },
  nextButton: {
    marginRight: 10,
  },
  noPhotoContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 16,
  },
  noPhotoText: {
    color: colors.text.secondary,
    marginTop: 10,
  },
  addPhotoButton: {
    backgroundColor: isDarkMode ? colors.accent : colors.secondary,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  addPhotoText: {
    color: isDarkMode ? colors.background : colors.surface,
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  contentCard: {
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.accent : colors.primary,
    ...shadows.medium,
  },
  content: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 4,
  },
  tag: {
    color: isDarkMode ? colors.accent : colors.primary,
    backgroundColor: isDarkMode ? 'rgba(246,173,85,0.10)' : 'rgba(43,108,176,0.10)',
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  commentsSection: {
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.accent : colors.primary,
    ...shadows.medium,
  },
  commentsSectionTitle: {
    ...typography.h3,
    color: isDarkMode ? colors.accent : colors.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  commentsList: {
    marginBottom: 6,
    padding: 6,
  },
  commentItem: {
    backgroundColor: isDarkMode ? colors.surface : colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.accent : colors.primary,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  commentUserAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentUserAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: isDarkMode ? colors.accent : colors.primary,
    fontSize: 14,
    marginRight: 8,
  },
  youBadge: {
    fontSize: 12,
    color: colors.success,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  commentDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  commentText: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  noCommentsText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  sendCommentButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  disabledButton: {
    backgroundColor: colors.text.secondary,
  },
  refreshButton: {
    padding: 5,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default JournalEntryDetailScreen; 