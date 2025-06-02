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
  missionDescription?: string;
  onClose: () => void;
  onSuccess: (imageUrl: string) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  missionId,
  missionTitle,
  missionDescription = "",
  onClose,
  onSuccess
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [image, setImage] = useState<string | null>(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [verifyingImage, setVerifyingImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState('');

  const pickImage = async () => {
    setError(null);
    setImageLoading(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError('Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Imagen seleccionada URI:', result.assets[0].uri);

        try {
          const response = await fetch(result.assets[0].uri);
          if (response.status === 200) {
            setImage(result.assets[0].uri);

            if (isCloudinaryConfigured()) {
              const previewUrl = await previewInCloudinary(result.assets[0].uri);
              console.log('URL de previsualización generada:', previewUrl);
            }
          } else {
            setError('No se pudo acceder a la imagen seleccionada');
          }
        } catch (fetchError) {
          console.error('Error verificando imagen:', fetchError);
          setError('Error al cargar la imagen');
        }
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      setError('Error al seleccionar la imagen');
    } finally {
      setImageLoading(false);
    }
  };

  const takePhoto = async () => {
    setError(null);
    setImageLoading(true);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        setError('Se necesitan permisos para acceder a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Foto tomada URI:', result.assets[0].uri);

        try {
          const response = await fetch(result.assets[0].uri);
          if (response.status === 200) {
            setImage(result.assets[0].uri);

            if (isCloudinaryConfigured()) {
              const previewUrl = await previewInCloudinary(result.assets[0].uri);
              console.log('URL de previsualización generada:', previewUrl);
            }
          } else {
            setError('No se pudo acceder a la foto tomada');
          }
        } catch (fetchError) {
          console.error('Error verificando la foto:', fetchError);
          setError('Error al verificar la foto');
        }
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      setError('Error al tomar la foto');
    } finally {
      setImageLoading(false);
    }
  };

  const previewInCloudinary = async (imageUri: string) => {
    try {
      setUploading(true);
      setUploadProgress(20);

      const cloudinaryPreviewUrl = await uploadImageToCloudinary(imageUri, missionId);
      console.log('Previsualización en Cloudinary:', cloudinaryPreviewUrl);

      setCloudinaryUrl(cloudinaryPreviewUrl);
      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

      return cloudinaryPreviewUrl;
    } catch (error) {
      console.error('Error al previsualizar en Cloudinary:', error);
      setError('No se pudo previsualizar en Cloudinary');
      setUploading(false);
      return null;
    }
  };

  const verifyImageWithGemini = async (imageUri: string): Promise<boolean> => {
    try {
      const progressInterval = setInterval(() => {
        setVerificationProgress(prev => {
          if (prev < 20) return 25;
          const newProgress = prev + (Math.random() * 4);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 400);

      setVerificationMessage('Preparando imagen para análisis...');
      await new Promise(resolve => setTimeout(resolve, 800));

      const isCloudinaryImage = imageUri && imageUri.includes('cloudinary.com');

      const prompt = `Esta imagen fue tomada para completar la siguiente misión: "${missionTitle}". 
      La descripción de la misión es: "${missionDescription}".
      
      Analiza detalladamente si la imagen cumple con los requisitos de la misión basándote en la descripción.
      
      Responde únicamente con "SÍ CUMPLE" si la imagen claramente satisface los requisitos de la misión,
      o con "NO CUMPLE" si la imagen no satisface los requisitos o no se puede determinar claramente.
      
      Explica brevemente tu razonamiento después de tu respuesta.`;

      setVerificationMessage('Consultando a la IA sobre la imagen...');
      setVerificationProgress(prev => Math.min(prev + 10, 90));

      const apiKey = 'AIzaSyB4PuDOYXgbH9egme1UCO0CiRcOV4kVfMM';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      let requestBody;

      if (isCloudinaryImage) {
        requestBody = {
          contents: [{
            parts: [{ text: prompt + `\n\nURL de la imagen: ${imageUri}` }]
          }]
        };

        try {
          await fetch(imageUri, { method: 'HEAD' });
        } catch (fetchError) {
          console.warn('Error verificando accesibilidad de URL de Cloudinary:', fetchError);
        }
      } else {
        setVerificationMessage('Procesando imagen...');
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result?.toString() || '';
            const base64 = result.split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64Data || base64Data.length < 100) {
          clearInterval(progressInterval);
          setVerificationMessage('Error procesando la imagen. Intenta con otra imagen.');
          setVerificationProgress(100);
          await new Promise(r => setTimeout(r, 1500));
          return false;
        }

        requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }]
        };
      }

      try {
        const geminiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!geminiResponse.ok) {
          throw new Error(await geminiResponse.text());
        }

        const geminiData = await geminiResponse.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Respuesta de Gemini:', responseText);

        const imageComplies = responseText.includes('SÍ CUMPLE');

        clearInterval(progressInterval);
        setVerificationProgress(100);

        if (!imageComplies) {
          const explanation = responseText.split('NO CUMPLE').length > 1 ?
            responseText.split('NO CUMPLE')[1].trim() :
            'La imagen no parece cumplir con los requisitos de la misión.';

          await new Promise(r => setTimeout(r, 500));

          return new Promise<boolean>((resolveAlert) => {
            Alert.alert(
              "La imagen no cumple con la misión",
              `${explanation}\n\nPor favor, selecciona otra imagen que cumpla con los requisitos.`,
              [{
                text: "Seleccionar otra imagen",
                onPress: () => {
                  setImage(null);
                  setVerifyingImage(false);
                  resolveAlert(false);
                }
              }]
            );
          });
        }

        setVerificationMessage('Verificación exitosa. Preparando carga...');
        await new Promise(r => setTimeout(r, 1000));
        return true;

      } catch (error) {
        console.error('Error al comunicarse con Gemini:', error);
        clearInterval(progressInterval);
        setVerificationMessage('Error de conexión. No se puede verificar la imagen.');
        setVerificationProgress(100);

        await new Promise(r => setTimeout(r, 1500));

        return new Promise<boolean>((resolveAlert) => {
          Alert.alert(
            "Error de verificación",
            "No se pudo verificar la imagen debido a un error de conexión. ¿Deseas continuar de todos modos?",
            [
              {
                text: "Cancelar",
                onPress: () => {
                  setVerifyingImage(false);
                  resolveAlert(false);
                },
                style: "cancel"
              },
              {
                text: "Continuar",
                onPress: () => resolveAlert(true)
              }
            ]
          );
        });
      }

    } catch (error) {
      console.error('Error al verificar la imagen con Gemini:', error);
      setVerificationMessage('Error al verificar la imagen. Continuando sin verificar...');
      setVerificationProgress(100);

      await new Promise(r => setTimeout(r, 1500));

      return new Promise<boolean>((resolveAlert) => {
        Alert.alert(
          "Error de verificación",
          "Ocurrió un problema al verificar la imagen. ¿Deseas continuar de todos modos?",
          [
            {
              text: "Cancelar",
              onPress: () => {
                setVerifyingImage(false);
                resolveAlert(false);
              },
              style: "cancel"
            },
            {
              text: "Continuar",
              onPress: () => resolveAlert(true)
            }
          ]
        );
      });
    }
  };

  const uploadImage = async () => {
    if (!image) {
      setError('Por favor, selecciona o toma una foto');
      return;
    }

    setVerifyingImage(true);
    setVerificationProgress(0);
    setVerificationMessage('Iniciando verificación...');

    const initialProgressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        const newProgress = prev + 2;
        return newProgress >= 20 ? 20 : newProgress;
      });
    }, 200);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const imageVerified = await verifyImageWithGemini(image);
      clearInterval(initialProgressInterval);

      if (!imageVerified) {
        setVerifyingImage(false);
        setError('La imagen no cumple con los requisitos de la misión. Por favor, selecciona otra imagen.');
        return;
      }

      if (cloudinaryUrl) {
        console.log('Usando URL de Cloudinary ya cargada:', cloudinaryUrl);
        setVerificationProgress(100);
        await new Promise(resolve => setTimeout(resolve, 800));
        setVerifyingImage(false);
        onSuccess(cloudinaryUrl);
        return;
      }

      setVerificationMessage('Preparando para subir...');
      setVerificationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 800));

      setVerifyingImage(false);
      setUploading(true);
      setError(null);

      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + (Math.random() * 10);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      try {
        console.log('Iniciando subida de imagen para misión:', missionId);

        if (!isCloudinaryConfigured()) {
          console.warn('Cloudinary no está configurado correctamente');

          if (__DEV__) {
            clearInterval(uploadProgressInterval);
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
            clearInterval(uploadProgressInterval);
            setUploadProgress(0);
            setError('Cloudinary no está configurado. Por favor, configura tus credenciales.');
            setShowConfigGuide(true);
            setUploading(false);
            return;
          }
        }

        const imageUrl = await uploadImageToCloudinary(image, missionId);
        setCloudinaryUrl(imageUrl);
        setUploadProgress(100);
        console.log('Imagen subida exitosamente, URL:', imageUrl);

        setTimeout(() => {
          onSuccess(imageUrl);
        }, 500);
      } catch (err: any) {
        clearInterval(uploadProgressInterval);
        setUploadProgress(0);
        console.error('Error al subir imagen:', err);

        const isCloudinaryConfigError =
          err.message?.includes('400') ||
          err.message?.includes('401') ||
          err.message?.includes('Cloudinary') ||
          err.message?.includes('cloud_name');

        if (__DEV__) {
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
          if (isCloudinaryConfigError) {
            setError('Error de configuración de Cloudinary. Contacta al administrador.');
            setShowConfigGuide(true);
          } else {
            setError('Error al subir la imagen. Inténtalo de nuevo.');
          }
        }
      } finally {
        clearInterval(uploadProgressInterval);
        setUploading(false);
      }
    } catch (error) {
      clearInterval(initialProgressInterval);
      console.error('Error general en el proceso de verificación/carga:', error);
      setVerifyingImage(false);
      setError('Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.');
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

            {missionDescription ? (
              <Text style={styles.missionDescription}>{missionDescription}</Text>
            ) : null}

            <Text style={styles.instructions}>
              {image ? 'Foto lista para completar la misión' : 'Sube una foto para completar esta misión'}
            </Text>

            {image ? (
              <>
                <View style={styles.imageCardContainer}>
                  <View style={styles.imageCardHeader}>
                    <View style={styles.imageIconContainer}>
                      <Ionicons name="image-outline" size={20} color="#005F9E" />
                      <Text style={styles.imageCardHeaderText}>Imagen seleccionada</Text>
                    </View>
                  </View>

                  <View style={styles.imagePreviewContainer}>
                    {imageLoading ? (
                      <View style={styles.previewImageLoading}>
                        <ActivityIndicator size="large" color="#005F9E" />
                        <Text style={styles.loadingText}>Cargando imagen...</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: cloudinaryUrl || image }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  <View style={styles.imageCardActions}>
                    <TouchableOpacity style={styles.imageActionButton} onPress={() => {
                      setImage(null);
                      setCloudinaryUrl(null);
                    }}>
                      <Ionicons name="refresh-outline" size={18} color="#005F9E" />
                      <Text style={styles.imageActionText}>Cambiar foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.imageActionButton}>
                      <Ionicons name="expand-outline" size={18} color="#005F9E" />
                      <Text style={styles.imageActionText}>Ver a tamaño completo</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {(uploading || verifyingImage) && (
                  <View style={styles.progressContainer}>
                    {verifyingImage ? (
                      <>
                        <View style={styles.verificationContainer}>
                          <View style={styles.verificationImageContainer}>
                            <Image
                              source={{ uri: cloudinaryUrl || image }}
                              style={styles.verificationThumbnail}
                              resizeMode="cover"
                            />
                            <ActivityIndicator size="small" color="#005F9E" style={styles.verificationLoader} />
                          </View>
                          <View style={styles.verificationTextContainer}>
                            <Text style={styles.verificationTitle}>Analizando foto</Text>
                            <Text style={styles.verificationMessage}>{verificationMessage}</Text>
                          </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${verificationProgress}%` }]} />
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.progressText}>Subiendo imagen...</Text>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                        </View>
                      </>
                    )}
                  </View>
                )}

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
                  </View>
                )}

                <View style={styles.actionButtonsContainer}>
                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleClose}
                      disabled={uploading || verifyingImage}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={uploadImage}
                      disabled={uploading || verifyingImage || !image}
                    >
                      {uploading || verifyingImage ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.completeButtonText}>Completar misión</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.photoOptions}>
                  <TouchableOpacity
                    style={styles.photoOptionButton}
                    onPress={takePhoto}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <ActivityIndicator size="small" color="#005F9E" />
                    ) : (
                      <Ionicons name="camera" size={36} color="#005F9E" />
                    )}
                    <Text style={styles.photoOptionText}>Tomar foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoOptionButton}
                    onPress={pickImage}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <ActivityIndicator size="small" color="#005F9E" />
                    ) : (
                      <Ionicons name="images" size={36} color="#005F9E" />
                    )}
                    <Text style={styles.photoOptionText}>Galería</Text>
                  </TouchableOpacity>
                </View>

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
                  </View>
                )}

                <View style={styles.actionButtonsContainer}>
                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleClose}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
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
    width: '100%',
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
    marginBottom: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  missionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
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
    width: '100%',
  },
  photoOptionButton: {
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    width: '45%',
  },
  photoOptionText: {
    marginTop: 8,
    color: '#333',
    fontSize: 14,
  },
  imageCardContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imageCardHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  imageIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCardHeaderText: {
    fontSize: 16,
    color: '#005F9E',
    marginLeft: 8,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#f5f5f5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  imageCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
  },
  imageActionText: {
    color: '#005F9E',
    marginLeft: 5,
    fontSize: 14,
  },
  progressContainer: {
    width: '100%',
    marginVertical: 15,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    marginVertical: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#005F9E',
  },
  actionButtonsContainer: {
    width: '100%',
    marginTop: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 30,
    width: '100%',
    overflow: 'hidden',
  },
  actionButton: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#005F9E',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  cancelButton: {
    backgroundColor: '#EFEFEF',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
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
  errorContainer: {
    width: '100%',
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 10,
  },
  verificationImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  verificationThumbnail: {
    width: '100%',
    height: '100%',
  },
  verificationLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#005F9E',
    marginBottom: 4,
  },
  verificationMessage: {
    fontSize: 14,
    color: '#666',
  },
});

export default ImageUploadModal; 