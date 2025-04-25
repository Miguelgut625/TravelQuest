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
    
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      setError('Se necesitan permisos para acceder a la galería');
      setImageLoading(false);
      return;
    }
    
    // Abrir selector de imágenes
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Imagen seleccionada URI:', result.assets[0].uri);
        
        // Verificar si la imagen existe
        try {
          const response = await fetch(result.assets[0].uri);
          console.log('Estado de respuesta de la imagen:', response.status);
          
          if (response.status === 200) {
            // La imagen existe, guardamos su URI
            console.log('Imagen verificada correctamente');
            setImage(result.assets[0].uri);
            
            // Cargar previamente en Cloudinary si es posible
            if (isCloudinaryConfigured()) {
              console.log('Subiendo previsualización a Cloudinary...');
              const previewUrl = await previewInCloudinary(result.assets[0].uri);
              console.log('URL de previsualización generada:', previewUrl);
            } else {
              console.log('Cloudinary no está configurado, usando imagen local');
            }
          } else {
            console.error('Error: No se pudo acceder a la imagen seleccionada, estado:', response.status);
            setError('No se pudo acceder a la imagen seleccionada');
          }
        } catch (fetchError) {
          console.error('Error verificando imagen:', fetchError);
          setError('Error al cargar la imagen');
        }
      } else {
        console.log('Selección de imagen cancelada o no se seleccionó ninguna imagen');
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
    
    // Solicitar permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      setError('Se necesitan permisos para acceder a la cámara');
      setImageLoading(false);
      return;
    }
    
    // Abrir cámara
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Foto tomada URI:', result.assets[0].uri);
        
        try {
          // Verificar que la imagen es accesible
          const response = await fetch(result.assets[0].uri);
          console.log('Estado de respuesta de la foto:', response.status);
          
          if (response.status === 200) {
            console.log('Foto verificada correctamente');
            setImage(result.assets[0].uri);
            
            // Cargar previamente en Cloudinary si es posible
            if (isCloudinaryConfigured()) {
              console.log('Subiendo previsualización de foto a Cloudinary...');
              const previewUrl = await previewInCloudinary(result.assets[0].uri);
              console.log('URL de previsualización generada:', previewUrl);
            } else {
              console.log('Cloudinary no está configurado, usando foto local');
            }
          } else {
            console.error('Error: No se pudo acceder a la foto tomada, estado:', response.status);
            setError('No se pudo acceder a la foto tomada');
          }
        } catch (fetchError) {
          console.error('Error verificando la foto:', fetchError);
          setError('Error al verificar la foto');
        }
      } else {
        console.log('Captura de foto cancelada o no se tomó ninguna foto');
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

      // Subir a Cloudinary para previsualizar
      const cloudinaryPreviewUrl = await uploadImageToCloudinary(imageUri, missionId);
      console.log('Previsualización en Cloudinary:', cloudinaryPreviewUrl);
      
      // Actualizar URL de Cloudinary
      setCloudinaryUrl(cloudinaryPreviewUrl);
      setUploadProgress(100);
      
      // Esperar un momento y ocultar el progreso
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
      // Los estados iniciales ya se establecieron en uploadImage
      
      // Simulación de progreso de verificación, continuando desde el 20% inicial
      const progressInterval = setInterval(() => {
        setVerificationProgress(prev => {
          if (prev < 20) return 25; // Asegurar que empieza al menos en 25%
          const newProgress = prev + (Math.random() * 4);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 400);
      
      // Actualizar mensaje y esperar un momento para dar sensación de progreso
      setVerificationMessage('Preparando imagen para análisis...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Convertir la imagen a formato base64
      setVerificationMessage('Procesando imagen...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Crear un objeto FileReader para convertir el blob a base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          // Actualizar mensaje y esperar un momento
          setVerificationMessage('Analizando contenido de la imagen...');
          await new Promise(r => setTimeout(r, 1000));
          
          // El resultado es una string con formato "data:image/jpeg;base64,BASE64_DATA"
          const base64data = reader.result?.toString().split(',')[1] || '';
          
          // Construir la solicitud para la API de Gemini
          const apiKey = 'AIzaSyB4PuDOYXgbH9egme1UCO0CiRcOV4kVfMM';
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
          
          // Crear el prompt para Gemini
          const prompt = `Esta imagen fue tomada para completar la siguiente misión: "${missionTitle}". 
          La descripción de la misión es: "${missionDescription}".
          
          Analiza detalladamente si la imagen cumple con los requisitos de la misión basándote en la descripción.
          
          Responde únicamente con "SÍ CUMPLE" si la imagen claramente satisface los requisitos de la misión,
          o con "NO CUMPLE" si la imagen no satisface los requisitos o no se puede determinar claramente.
          
          Explica brevemente tu razonamiento después de tu respuesta.`;
          
          // Actualizar mensaje y avanzar progreso
          setVerificationMessage('Consultando a la IA sobre la imagen...');
          setVerificationProgress(prev => Math.min(prev + 10, 90));
          
          // Crear el cuerpo de la solicitud
          const requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64data
                    }
                  }
                ]
              }
            ]
          };
          
          // Enviar la solicitud a la API de Gemini
          try {
            const geminiResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });
            
            if (!geminiResponse.ok) {
              console.error('Error en la respuesta de Gemini:', await geminiResponse.text());
              clearInterval(progressInterval);
              setVerificationMessage('No se pudo verificar la imagen. Continuando de todos modos...');
              setVerificationProgress(100);
              
              // En caso de error, no permitimos continuar
              await new Promise(r => setTimeout(r, 1500));
              resolve(false);
              return;
            }
            
            setVerificationMessage('Interpretando respuesta de IA...');
            setVerificationProgress(95);
            
            const geminiData = await geminiResponse.json();
            const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('Respuesta de Gemini:', responseText);
            
            // Verificar si la respuesta indica que la imagen cumple
            const imageComplies = responseText.includes('SÍ CUMPLE');
            
            clearInterval(progressInterval);
            setVerificationProgress(100);
            
            if (!imageComplies) {
              // Extraer la explicación
              const explanation = responseText.split('NO CUMPLE').length > 1 ? 
                responseText.split('NO CUMPLE')[1].trim() : 
                'La imagen no parece cumplir con los requisitos de la misión.';
              
              // Esperar un momento antes de mostrar la alerta
              await new Promise(r => setTimeout(r, 500));
              
              Alert.alert(
                "La imagen no cumple con la misión",
                `${explanation}\n\nPor favor, selecciona otra imagen que cumpla con los requisitos.`,
                [
                  {
                    text: "Seleccionar otra imagen",
                    onPress: () => {
                      setImage(null);
                      setVerifyingImage(false);
                      resolve(false);
                    }
                  }
                ]
              );
              resolve(false);
            } else {
              setVerificationMessage('Verificación exitosa. Preparando carga...');
              // Esperamos un momento para mostrar el progreso completo
              await new Promise(r => setTimeout(r, 1000));
              resolve(true);
            }
          } catch (fetchError) {
            console.error('Error al comunicarse con Gemini:', fetchError);
            clearInterval(progressInterval);
            setVerificationMessage('Error de conexión. No se puede verificar la imagen.');
            setVerificationProgress(100);
            
            // En caso de error, no permitimos continuar
            await new Promise(r => setTimeout(r, 1500));
            resolve(false);
          }
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al verificar la imagen con Gemini:', error);
      setVerificationMessage('Error al verificar la imagen. No se puede completar la misión.');
      setVerificationProgress(100);
      
      // En caso de error en la verificación, no permitimos continuar
      await new Promise(r => setTimeout(r, 1500));
      return false;
    }
  };

  const uploadImage = async () => {
    if (!image) {
      setError('Por favor, selecciona o toma una foto');
      return;
    }
    
    // Verificar la imagen con Gemini antes de subirla
    setVerifyingImage(true);
    setVerificationProgress(0);
    setVerificationMessage('Iniciando verificación...');
    
    // Avanzar progreso mientras se prepara la verificación
    const initialProgressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        const newProgress = prev + 2;
        return newProgress >= 20 ? 20 : newProgress;
      });
    }, 200);
    
    // Pequeña pausa para asegurar que la UI se actualice
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const imageVerified = await verifyImageWithGemini(image);
      clearInterval(initialProgressInterval);
      
      if (!imageVerified) {
        // Si la imagen no es verificada, no procedemos con la carga
        setVerifyingImage(false);
        setError('La imagen no cumple con los requisitos de la misión. Por favor, selecciona otra imagen.');
        return;
      }
      
      // Si ya tenemos una URL de Cloudinary, usarla directamente
      if (cloudinaryUrl) {
        console.log('Usando URL de Cloudinary ya cargada:', cloudinaryUrl);
        setVerificationProgress(100);
        // Pequeña pausa para mostrar el progreso completo
        await new Promise(resolve => setTimeout(resolve, 800));
        setVerifyingImage(false);
        onSuccess(cloudinaryUrl);
        return;
      }
      
      // Transición suave entre verificación y carga
      setVerificationMessage('Preparando para subir...');
      setVerificationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setVerifyingImage(false);
      setUploading(true);
      setError(null);
      
      // Mostrar progreso simulado
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + (Math.random() * 10);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Resto del código de upload...
      try {
        console.log('Iniciando subida de imagen para misión:', missionId);
        
        // Verificar si Cloudinary está configurado
        if (!isCloudinaryConfigured()) {
          console.warn('Cloudinary no está configurado correctamente');
          
          if (__DEV__) {
            console.warn('En modo desarrollo, continuaremos con una imagen local');
            
            // Preguntamos al usuario qué desea hacer
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
        
        // Esperar un momento antes de cerrar el modal
        setTimeout(() => {
          onSuccess(imageUrl);
        }, 500);
      } catch (err: any) {
        clearInterval(uploadProgressInterval);
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