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

interface JournalEntryDetailScreenProps {
  route: RouteProp<{ JournalEntryDetail: { entry: any } }, 'JournalEntryDetail'>;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  username?: string;
}

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

  const fetchComments = async () => {
    try {
      const data = await getCommentsByEntryId(entry.id);
      console.log('Comentarios obtenidos:', data); // Para debug
      setComments(data);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#005F9E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Entrada no encontrada</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la entrada del diario</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header con botón de regreso */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{entry.title}</Text>
          
          {/* Botón de refresco */}
          <TouchableOpacity onPress={refreshEntry} style={styles.refreshButton} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Ionicons name="refresh" size={24} color="#333" />
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Fecha */}
          <Text style={styles.dateText}>{formatDate(entry.created_at)}</Text>
          
          {/* Imágenes */}
          {entry.photos && entry.photos.length > 0 ? (
            <View style={styles.photoContainer}>
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
            </View>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <Text style={styles.noPhotoText}>Sin imágenes</Text>
            </View>
          )}
          
          {/* Botón para añadir imágenes */}
          <TouchableOpacity 
            style={styles.addPhotoButton} 
            onPress={handleAddPhoto}
            disabled={isAddingPhoto}
          >
            {isAddingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addPhotoText}>Añadir imagen</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Contenido principal */}
          <View style={styles.contentContainer}>
            <Text style={styles.content}>
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
                <Text key={index} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}
          
          {/* Sección de comentarios */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>Comentarios</Text>
            
            {/* Lista de comentarios */}
            {comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((comment, index) => (
                  <View key={comment.id || index} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.username || 'Usuario'}</Text>
                      <Text style={styles.commentDate}>{formatCommentDate(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noCommentsText}>No hay comentarios aún. ¡Sé el primero en comentar!</Text>
            )}
            
            {/* Añadir comentario */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escribe un comentario..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                style={[
                  styles.sendCommentButton,
                  (!newComment.trim() || isAddingComment) && styles.disabledButton
                ]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
              >
                {isAddingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mainPhoto: {
    height: 250,
    borderRadius: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 16,
  },
  noPhotoText: {
    color: '#999',
    marginTop: 10,
  },
  addPhotoButton: {
    backgroundColor: '#005F9E',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addPhotoText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  contentContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'justify',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    color: '#005F9E',
    marginRight: 10,
    marginBottom: 5,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  commentsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  commentsList: {
    marginBottom: 16,
  },
  commentItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  noCommentsText: {
    color: '#999',
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
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendCommentButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  refreshButton: {
    padding: 5,
  },
});

export default JournalEntryDetailScreen; 