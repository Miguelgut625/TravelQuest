import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Platform,
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadImageToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import CloudinaryConfigGuide from './CloudinaryConfigGuide';
import { getMissionHint, HINT_COST } from '../services/missionService';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

interface ImageUploadModalProps {
  visible: boolean;
  missionId: string;
  missionTitle: string;
  onClose: () => void;
  onSuccess: (imageUrl: string) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  missionId,
  missionTitle,
  onClose,
  onSuccess
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const pickImage = async () => {
    setError(null);
    
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      setError('Se necesitan permisos para acceder a la galería');
      return;
    }
    
    // Abrir selector de imágenes
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setError(null);
    
    // Solicitar permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      setError('Se necesitan permisos para acceder a la cámara');
      return;
    }
    
    // Abrir cámara
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!image) {
      setError('Por favor, selecciona o toma una foto');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    // Mostrar progreso simulado
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + (Math.random() * 10);
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      console.log('Iniciando subida de imagen para misión:', missionId);
      
      // Verificar si Cloudinary está configurado
      if (!isCloudinaryConfigured()) {
        console.warn('Cloudinary no está configurado correctamente');
        
        if (__DEV__) {
          console.warn('En modo desarrollo, continuaremos con una imagen local');
          
          // Preguntamos al usuario qué desea hacer
          clearInterval(progressInterval);
          setUploadProgress(0);
          
          Alert.alert(
            "Configuración de Cloudinary",
            "Cloudinary no está configurado correctamente. En modo desarrollo puedes continuar con la imagen local o configurar Cloudinary.",
            [
              {
                text: "Configurar Cloudinary",
                onPress: () => {
                  setShowConfigGuide(true);
                  setUploading(false);
                }
              },
              {
                text: "Continuar con imagen local",
                onPress: () => {
                  // Simulamos subida
                  setUploadProgress(50);
                  setTimeout(() => {
                    setUploadProgress(100);
                    setTimeout(() => {
                      onSuccess(image);
                    }, 500);
                  }, 1000);
                }
              }
            ],
            { cancelable: false }
          );
          return;
        } else {
          clearInterval(progressInterval);
          setUploadProgress(0);
          setError('Cloudinary no está configurado. Por favor, configura tus credenciales.');
          setShowConfigGuide(true);
          setUploading(false);
          return;
        }
      }
      
      const imageUrl = await uploadImageToCloudinary(image, missionId);
      setUploadProgress(100);
      console.log('Imagen subida exitosamente, URL:', imageUrl);
      
      // Esperar un momento antes de cerrar el modal
      setTimeout(() => {
        onSuccess(imageUrl);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      console.error('Error al subir imagen:', err);
      
      // Verificar si es un error de configuración de Cloudinary
      const isCloudinaryConfigError = 
        err.message?.includes('400') || 
        err.message?.includes('401') || 
        err.message?.includes('Cloudinary') ||
        err.message?.includes('cloud_name');
      
      if (__DEV__) {
        // En desarrollo, mostramos diálogo con opciones
        Alert.alert(
          "Error al subir imagen",
          `${err.message || 'Error desconocido'}\n\n${isCloudinaryConfigError ? 'Parece un problema de configuración de Cloudinary.' : '¿Qué deseas hacer?'}`,
          isCloudinaryConfigError ? [
            {
              text: "Configurar Cloudinary",
              onPress: () => setShowConfigGuide(true)
            },
            { 
              text: "Cancelar", 
              style: "cancel"
            }
          ] : [
            {
              text: "Reintentar",
              onPress: () => uploadImage()
            },
            { 
              text: "Continuar con imagen local", 
              onPress: () => {
                console.log('Continuando con imagen local en modo desarrollo');
                // Simulamos subida
                setUploadProgress(50);
                setTimeout(() => {
                  setUploadProgress(100);
                  setTimeout(() => {
                    onSuccess(image);
                  }, 500);
                }, 1000);
              }
            },
            { 
              text: "Cancelar", 
              style: "cancel"
            }
          ],
          { cancelable: true }
        );
      } else {
        // En producción, mostramos mensaje simple
        if (isCloudinaryConfigError) {
          setError('Error de configuración de Cloudinary. Contacta al administrador.');
          setShowConfigGuide(true);
        } else {
          setError('Error al subir la imagen. Inténtalo de nuevo.');
        }
      }
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
    }
  };

  const resetModal = () => {
    setImage(null);
    setError(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getHint = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para obtener pistas');
      return;
    }

    setLoadingHint(true);
    setError(null);

    try {
      // Confirmar que el usuario quiere gastar los puntos
      Alert.alert(
        "Obtener pista",
        `¿Quieres recibir una pista? Esto costará ${HINT_COST} puntos.`,
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => setLoadingHint(false)
          },
          {
            text: "Obtener pista",
            onPress: async () => {
              try {
                const hintData = await getMissionHint(user.id, missionId);
                setHint(hintData.hint);
              } catch (error: any) {
                if (error.message.includes('No hay suficientes puntos')) {
                  Alert.alert('Error', 'No tienes suficientes puntos para obtener una pista');
                } else {
                  Alert.alert('Error', 'No se pudo obtener la pista. Inténtalo de nuevo.');
                }
                console.error('Error al obtener pista:', error);
              } finally {
                setLoadingHint(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al mostrar diálogo de pista:', error);
      setLoadingHint(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        {showConfigGuide ? (
          <CloudinaryConfigGuide onClose={() => setShowConfigGuide(false)} />
        ) : (
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Completa la misión</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.missionTitle}>{missionTitle}</Text>
            
            <Text style={styles.instructions}>
              Sube una foto para completar esta misión
            </Text>
            
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.changeImageButton}
                  onPress={() => setImage(null)}
                >
                  <Text style={styles.changeImageText}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={36} color="#005F9E" />
                  <Text style={styles.photoOptionText}>Tomar foto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={pickImage}
                >
                  <Ionicons name="images" size={36} color="#005F9E" />
                  <Text style={styles.photoOptionText}>Galería</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Sección de pista */}
            {hint ? (
              <View style={styles.hintContainer}>
                <Text style={styles.hintTitle}>Pista:</Text>
                <Text style={styles.hintText}>{hint}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.hintButton}
                onPress={getHint}
                disabled={loadingHint}
              >
                {loadingHint ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="bulb" size={20} color="white" />
                    <Text style={styles.hintButtonText}>Dar pista ({HINT_COST} puntos)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {error.includes('Cloudinary') && (
                  <TouchableOpacity 
                    style={styles.configButton}
                    onPress={() => setShowConfigGuide(true)}
                  >
                    <Text style={styles.configButtonText}>Ver guía de configuración</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {uploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${uploadProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {uploadProgress < 100 ? 'Subiendo imagen...' : '¡Subida completada!'}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#005F9E' }]}
                onPress={uploadImage}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>
                  {uploading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    'Completar misión'
                  )}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#78909C' }]}
                onPress={handleClose}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  missionTitle: {
    fontSize: 18,
    color: '#005F9E',
    marginBottom: 15,
    fontWeight: '500',
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  photoOptionButton: {
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    width: 120,
  },
  photoOptionText: {
    marginTop: 8,
    color: '#333',
    fontSize: 14,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  changeImageButton: {
    padding: 8,
  },
  changeImageText: {
    color: '#005F9E',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressContainer: {
    marginBottom: 15,
    width: '100%',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#005F9E',
    borderRadius: 5,
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 5,
  },
  configButton: {
    padding: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  configButtonText: {
    color: '#005F9E',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  hintButton: {
    backgroundColor: '#FFB74D',
    padding: 12,
    borderRadius: 10,
    marginVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  hintButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  hintContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#005F9E',
    width: '100%',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 5,
  },
  hintText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default ImageUploadModal; 