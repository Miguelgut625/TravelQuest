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
  Alert,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadImageToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import CloudinaryConfigGuide from './CloudinaryConfigGuide';
import { getMissionHint, HINT_COST } from '../services/missionService';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { useTheme } from '../context/ThemeContext';
import { getMissionModalsStyles } from '../styles/theme';

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
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = getMissionModalsStyles(colors, isDarkMode, width);

  // Utilidad para color dinámico
  const getPrimaryOrAccent = (isDarkMode, colors) => isDarkMode ? colors.accent : colors.primary;

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
      <View style={styles.modalOverlay}>
        {showConfigGuide ? (
          <CloudinaryConfigGuide onClose={() => setShowConfigGuide(false)} />
        ) : (
          <ScrollView style={{ maxHeight: '90%', width: '100%' }} contentContainerStyle={[styles.modalContent, { flexGrow: 1 }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Completa la misión</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDarkMode ? colors.surface : '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.10,
                  shadowRadius: 2,
                  elevation: 2,
                  marginLeft: 8,
                }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={getPrimaryOrAccent(isDarkMode, colors)}
                />
              </TouchableOpacity>
            </View>

            {/* Título de la misión */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  marginBottom: 4,
                  color: getPrimaryOrAccent(isDarkMode, colors),
                },
              ]}
            >
              {missionTitle}
            </Text>
            {missionDescription ? (
              <Text style={[styles.hintText, { textAlign: 'center', marginBottom: 10, fontStyle: 'italic' }]}>{missionDescription}</Text>
            ) : null}

            {/* Instrucción */}
            <Text style={[styles.hintText, { textAlign: 'center', marginBottom: 16 }]}>
              {image ? 'Foto lista para completar la misión' : 'Sube una foto para completar esta misión'}
            </Text>

            {/* Si hay imagen seleccionada */}
            {image ? (
              <>
                <View style={styles.imageCardContainer}>
                  <View style={styles.imageCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="image-outline" size={20} color={getPrimaryOrAccent(isDarkMode, colors)} />
                      <Text style={[styles.imageCardHeaderText, { color: getPrimaryOrAccent(isDarkMode, colors) }]}>Imagen seleccionada</Text>
                    </View>
                  </View>
                  <View style={styles.imagePreviewContainer}>
                    {imageLoading ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={getPrimaryOrAccent(isDarkMode, colors)} />
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => { setImage(null); setCloudinaryUrl(null); }}>
                      <Ionicons name="refresh-outline" size={18} color={getPrimaryOrAccent(isDarkMode, colors)} />
                      <Text style={[styles.imageActionText, { color: getPrimaryOrAccent(isDarkMode, colors) }]}>Cambiar foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="expand-outline" size={18} color={getPrimaryOrAccent(isDarkMode, colors)} />
                      <Text style={[styles.imageActionText, { color: getPrimaryOrAccent(isDarkMode, colors) }]}>Ver a tamaño completo</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {(uploading || verifyingImage) && (
                  <View style={{ width: '100%', marginBottom: 12 }}>
                    {verifyingImage ? (
                      <>
                        <View style={styles.verificationContainer}>
                          <View style={styles.verificationImageContainer}>
                            <Image
                              source={{ uri: cloudinaryUrl || image }}
                              style={styles.verificationThumbnail}
                              resizeMode="cover"
                            />
                            <ActivityIndicator size="small" color={getPrimaryOrAccent(isDarkMode, colors)} style={styles.verificationLoader} />
                          </View>
                          <View style={styles.verificationTextContainer}>
                            <Text style={styles.verificationTitle}>Analizando foto</Text>
                            <Text style={styles.verificationMessage}>{verificationMessage}</Text>
                          </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${verificationProgress}%`, backgroundColor: isDarkMode ? colors.accent : colors.primary }]} />
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.progressText}>Subiendo imagen...</Text>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${uploadProgress}%`, backgroundColor: isDarkMode ? colors.accent : colors.primary }]} />
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Pista */}
                {hint ? (
                  <View
                    style={{
                      backgroundColor: isDarkMode ? colors.surface : '#E3F2FD',
                      padding: 15,
                      borderRadius: 10,
                      marginVertical: 15,
                      borderLeftWidth: 4,
                      borderLeftColor: getPrimaryOrAccent(isDarkMode, colors),
                      width: '100%',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: getPrimaryOrAccent(isDarkMode, colors), marginBottom: 5 }}>
                      Pista:
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                      {hint}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.hintButton, { marginVertical: 12 }]}
                    onPress={getHint}
                    disabled={loadingHint}
                  >
                    {loadingHint ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <Ionicons name="bulb" size={20} color={colors.surface} />
                        <Text style={styles.hintButtonText}>Dar pista ({HINT_COST} puntos)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Error */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Botones de acción */}
                <View style={{ width: '100%', alignItems: 'center', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      {
                        backgroundColor: getPrimaryOrAccent(isDarkMode, colors),
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 8,
                        marginBottom: 0,
                        width: '100%',
                        maxWidth: 400,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 3,
                        minWidth: 120,
                        borderWidth: isDarkMode ? 2 : 0,
                        borderColor: isDarkMode ? colors.accent : 'transparent',
                      },
                    ]}
                    onPress={uploadImage}
                    disabled={uploading || verifyingImage || !image}
                  >
                    {uploading || verifyingImage ? (
                      <ActivityIndicator color={isDarkMode ? '#181C22' : colors.surface} size="small" />
                    ) : (
                      <Text style={[styles.completeButtonText, { color: isDarkMode ? '#181C22' : colors.surface, fontWeight: 'bold', fontSize: 18 }]}>Completar misión</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Opciones de foto */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.mainButton,
                      {
                        flex: 1,
                        marginRight: 8,
                        flexDirection: 'column',
                        gap: 4,
                        backgroundColor: isDarkMode ? colors.surface : colors.primary,
                        borderWidth: 2,
                        borderColor: isDarkMode ? colors.accent : 'transparent',
                      },
                    ]}
                    onPress={takePhoto}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <ActivityIndicator size="small" color={isDarkMode ? colors.text.primary : colors.surface} />
                    ) : (
                      <Ionicons name="camera" size={32} color={isDarkMode ? colors.accent : colors.surface} />
                    )}
                    <Text
                      style={[styles.mainButtonText, { color: isDarkMode ? colors.text.primary : colors.surface }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      Tomar foto
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.mainButton,
                      {
                        flex: 1,
                        marginLeft: 8,
                        flexDirection: 'column',
                        gap: 4,
                        backgroundColor: isDarkMode ? colors.surface : colors.primary,
                        borderWidth: 2,
                        borderColor: isDarkMode ? colors.accent : 'transparent',
                      },
                    ]}
                    onPress={pickImage}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <ActivityIndicator size="small" color={isDarkMode ? colors.text.primary : colors.surface} />
                    ) : (
                      <Ionicons name="images" size={32} color={isDarkMode ? colors.accent : colors.surface} />
                    )}
                    <Text
                      style={[styles.mainButtonText, { color: isDarkMode ? colors.text.primary : colors.surface }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      Galería
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Pista */}
                {hint ? (
                  <View
                    style={{
                      backgroundColor: isDarkMode ? colors.surface : '#E3F2FD',
                      padding: 15,
                      borderRadius: 10,
                      marginVertical: 15,
                      borderLeftWidth: 4,
                      borderLeftColor: getPrimaryOrAccent(isDarkMode, colors),
                      width: '100%',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: getPrimaryOrAccent(isDarkMode, colors), marginBottom: 5 }}>
                      Pista:
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                      {hint}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.hintButton, { marginVertical: 12 }]}
                    onPress={getHint}
                    disabled={loadingHint}
                  >
                    {loadingHint ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <Ionicons name="bulb" size={20} color={colors.surface} />
                        <Text style={styles.hintButtonText}>Dar pista ({HINT_COST} puntos)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Error */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Botón cancelar */}
                <View style={styles.actionButtonsContainer}>
                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        {
                          backgroundColor: isDarkMode ? colors.divider : '#E2E8F0',
                          paddingVertical: 12,
                          paddingHorizontal: 24,
                          borderRadius: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 4,
                          elevation: 3,
                          width: 'auto',
                          minWidth: 120,
                          maxWidth: 200,
                          alignSelf: 'center',
                          alignItems: 'center',
                          marginTop: 16,
                          marginBottom: 0,
                        },
                      ]}
                      onPress={handleClose}
                      disabled={uploading || verifyingImage}
                    >
                      <Text style={{ fontSize: 16, color: colors.text.secondary, fontWeight: '500' }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default ImageUploadModal; 