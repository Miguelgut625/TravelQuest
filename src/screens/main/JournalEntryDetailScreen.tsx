// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, Dimensions, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { addPhotoToEntry, addCommentToEntry } from '../../services/journalService';
import { getJournalEntryById } from '../../services/journalService.js';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

interface JournalEntryDetailScreenProps {
  route: RouteProp<{ JournalEntryDetail: { entry: any } }, 'JournalEntryDetail'>;
}

interface Comment {
  id: string;
  userId: string;
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

  // Detectar si la descripción es generada por IA
  const isAIGenerated = entry.content && (
    entry.content.includes("nombre científico") || 
    entry.content.includes("año de construcción") || 
    entry.content.includes("estilo arquitectónico") ||
    entry.content.includes("CURIOSIDADES") ||
    entry.content.includes("curiosidades") ||
    entry.content.includes("Hoy he visitado")
  );

  // Función para refrescar la entrada actual desde la base de datos
  const refreshEntry = async () => {
    try {
      setRefreshing(true);
      // Obtener la entrada actualizada de la base de datos
      const updatedEntry = await getJournalEntryById(entry.id);
      if (updatedEntry) {
        // Actualizar la entrada en los parámetros de la ruta
        route.params.entry = updatedEntry;
        
        // Inicializar comentarios desde la entrada actualizada
        if (updatedEntry.comments && Array.isArray(updatedEntry.comments)) {
          setComments(updatedEntry.comments);
        } else {
          // Extraer comentarios del contenido actualizado
          extractCommentsFromContent(updatedEntry.content);
        }
      }
    } catch (error) {
      console.error('Error al refrescar la entrada:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Inicializar comentarios desde la entrada si existen
    if (entry.comments && Array.isArray(entry.comments)) {
      setComments(entry.comments);
    } else {
      // Extraer comentarios del contenido si están en formato [Comentario de...]
      extractCommentsFromContent();
    }
  }, [entry]);

  // Función para extraer comentarios del contenido
  const extractCommentsFromContent = (content = entry.content) => {
    if (!content) return;
    
    // Buscar todos los comentarios en el formato [Comentario de Usuario - fecha]
    const commentRegex = /\[Comentario de (.*?) - (.*?)\]\n([\s\S]*?)(?=\n\[Comentario de|$)/g;
    const extractedComments: Comment[] = [];
    let match;
    
    while ((match = commentRegex.exec(content)) !== null) {
      extractedComments.push({
        id: Date.now().toString() + extractedComments.length,
        userId: 'extracted', // No tenemos el userId real
        username: match[1],
        comment: match[3].trim(),
        created_at: match[2]
      });
    }
    
    if (extractedComments.length > 0) {
      setComments(extractedComments);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

      console.log('Intentando añadir comentario a la entrada:', entry.id);
      console.log('Usuario ID:', user.id);
      console.log('Comentario:', newComment);
      
      // Añadir directamente el comentario en memoria
      const newCommentObj: Comment = {
        id: Date.now().toString(),
        userId: user.id,
        comment: newComment,
        created_at: new Date().toISOString(),
        username: user.username || 'Usuario'
      };
      
      // Actualizar estado local primero para mejor UX
      setComments([...comments, newCommentObj]);
      setNewComment('');
      
      // Actualizar entrada local para mantener coherencia con el servidor
      // El formato de comentario que se agregará al contenido
      const commentToAdd = `\n\n[Comentario de ${user.username || 'Usuario'} - ${new Date().toLocaleString()}]\n${newComment}`;
      entry.content = entry.content + commentToAdd;
      
      // Finalmente guardar en el servidor (pero ya hemos actualizado la UI)
      const success = await addCommentToEntry(entry.id, user.id, newComment);
      
      if (!success) {
        console.warn('El comentario se guardó localmente pero no en el servidor');
        // No mostramos error al usuario porque ya vió su comentario en pantalla
      } else {
        console.log('Comentario guardado exitosamente en el servidor');
        // Ya no intentamos refrescar automáticamente, en su lugar actualizamos el modelo local
        // que ya se actualizó arriba cuando añadimos el comentario a comments y a entry.content
      }
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      Alert.alert('Error', 'Ocurrió un error al añadir el comentario, pero se guardó localmente');
    } finally {
      setIsAddingComment(false);
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
        
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshEntry} />
          }
        >
          {/* Fecha de la entrada */}
          <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
          
          {/* Carrusel de fotos */}
          {entry.photos && entry.photos.length > 0 && (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: entry.photos[currentPhotoIndex] }}
                style={styles.photo}
                resizeMode="cover"
              />
              
              {/* Navegación del carrusel */}
              {entry.photos.length > 1 && (
                <View style={styles.photoNavigation}>
                  <TouchableOpacity
                    style={[styles.navButton, currentPhotoIndex === 0 && styles.disabledButton]}
                    onPress={goToPrevPhoto}
                    disabled={currentPhotoIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  
                  <Text style={styles.photoCounter}>
                    {currentPhotoIndex + 1} / {entry.photos.length}
                  </Text>
                  
                  <TouchableOpacity
                    style={[styles.navButton, currentPhotoIndex === entry.photos.length - 1 && styles.disabledButton]}
                    onPress={goToNextPhoto}
                    disabled={currentPhotoIndex === entry.photos.length - 1}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {/* Botón para añadir foto */}
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
          
          {/* Contenido principal con indicador de IA si corresponde */}
          {isAIGenerated ? (
            <View style={styles.aiGeneratedContainer}>
              <View style={styles.aiGeneratedHeader}>
                <Ionicons name="sparkles" size={20} color="#7F5AF0" />
                <Text style={styles.aiGeneratedTitle}>Descripción generada por IA</Text>
              </View>
              <Text style={styles.aiGeneratedContent}>
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
          ) : (
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
          )}
          
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
  scrollContainer: {
    padding: 16,
  },
  date: {
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
  photo: {
    height: 250,
    borderRadius: 10,
  },
  photoNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  aiGeneratedContainer: {
    backgroundColor: '#f8f5ff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7F5AF0',
  },
  aiGeneratedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiGeneratedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F5AF0',
    marginLeft: 8,
  },
  aiGeneratedContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
});

export default JournalEntryDetailScreen; 