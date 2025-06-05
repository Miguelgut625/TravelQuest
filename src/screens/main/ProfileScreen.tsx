import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView, FlatList, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout, setAuthState, setUser } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { calculateNextLevelXP } from '../../services/experienceService';
import * as ImagePicker from 'expo-image-picker';
import { updateProfilePicture, getProfilePictureUrl } from '../../services/profileService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserBadges } from '../../services/badgeService';
import { lightBlue100 } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';
import { getAdvancedMissionStats, AdvancedMissionStats } from '../../services/statisticsService';
import { useTheme } from '../../context/ThemeContext';


// Definir interfaces para los tipos de datos
interface Journey {
  id: string;
  cityId: string;
  journeys_missions: JourneyMission[];
}

interface JourneyMission {
  completed: boolean;
  challenges: {
    points: number;
  };
}

interface FriendshipRequest {
  id: string;
  sender: {
    username: string;
  };
  users: {
    username: string;
  };
}

interface User {
  email: string;
  id: string;
  username?: string;
  profile_pic_url?: string;
  profile_visibility?: 'public' | 'friends' | 'private';
  custom_title?: string;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedMissions: 0,
    visitedCities: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [level, setLevel] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(100);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [friendsVisibility, setFriendsVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [commentsVisibility, setCommentsVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [badges, setBadges] = useState<any[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [realPoints, setRealPoints] = useState(0);
  const [advancedStats, setAdvancedStats] = useState<AdvancedMissionStats | null>(null);
  const [loadingAdvancedStats, setLoadingAdvancedStats] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  // Manejador global de errores no capturados para este componente
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Error no capturado en ProfileScreen:', event.error);
      // No mostramos un Alert aquí para evitar bloquear la UI
      // Simplemente registramos el error para depuración
    };

    // Agregar el listener solo en navegadores web
    if (Platform.OS === 'web') {
      window.addEventListener('error', handleGlobalError);
      return () => {
        window.removeEventListener('error', handleGlobalError);
      };
    }
  }, []);

  useEffect(() => {
    fetchUserStats();
    fetchProfilePicture();
    fetchProfileVisibility();
    fetchBadges();
    fetchCurrentTitle();
    fetchAdvancedStats();
  }, [user?.id]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoadingStats(true);
      console.log('Obteniendo estadísticas...');

      // Obtener los puntos, nivel y XP del usuario
      const { data: userPointsData, error: userPointsError } = await supabase
        .from('users')
        .select('points, level, xp, xp_next')
        .eq('id', user.id)
        .single();

      if (userPointsError) throw userPointsError;

      // Obtener los journeys del usuario con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`
          id,
          cityId,
          journeys_missions!inner (
            completed,
            challenges!inner (
              points
            )
          )
        `)
        .eq('userId', user.id);

      if (journeysError) throw journeysError;

      // Calcular estadísticas
      const stats = {
        totalPoints: 0,
        completedMissions: 0,
        visitedCities: new Set<string>()
      };

      (journeys as Journey[])?.forEach((journey: Journey) => {
        // Añadir la ciudad a las visitadas (usando Set para evitar duplicados)
        if (journey.cityId) {
          stats.visitedCities.add(journey.cityId);
        }

        // Contar misiones completadas y puntos
        journey.journeys_missions.forEach((mission: JourneyMission) => {
          if (mission.completed) {
            stats.completedMissions++;
            stats.totalPoints += mission.challenges.points;
          }
        });
      });

      setRealPoints(userPointsData?.points || 0);

      setStats({
        totalPoints: userPointsData?.points || 0,
        completedMissions: stats.completedMissions,
        visitedCities: stats.visitedCities.size
      });

      // Actualizar nivel y XP
      setLevel(userPointsData?.level || 1);
      setXp(userPointsData?.xp || 0);
      setXpNext(userPointsData?.xp_next || 50);

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchProfilePicture = async () => {
    if (!user?.id) return;

    try {
      const picUrl = await getProfilePictureUrl(user.id);
      setProfilePicUrl(picUrl);
    } catch (error) {
      console.error('Error al obtener la foto de perfil:', error);
    }
  };

  const fetchProfileVisibility = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_visibility, friends_visibility, comments_visibility')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfileVisibility(data?.profile_visibility || 'public');
      setFriendsVisibility(data?.friends_visibility || 'public');
      setCommentsVisibility(data?.comments_visibility || 'public');
    } catch (error) {
      console.error('Error al obtener configuración de privacidad:', error);
    }
  };

  const updateProfileVisibility = async (visibility: 'public' | 'friends' | 'private') => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_visibility: visibility })
        .eq('id', user.id);
      if (error) throw error;
      setProfileVisibility(visibility);
      Alert.alert('Éxito', 'Configuración de privacidad actualizada');
    } catch (error) {
      console.error('Error al actualizar configuración de privacidad:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración de privacidad');
    }
  };

  const updateFriendsVisibility = async (visibility: 'public' | 'friends' | 'private') => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ friends_visibility: visibility })
        .eq('id', user.id);
      if (error) throw error;
      setFriendsVisibility(visibility);
      Alert.alert('Éxito', 'Configuración de privacidad de amigos actualizada');
    } catch (error) {
      console.error('Error al actualizar configuración de privacidad de amigos:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración de privacidad de amigos');
    }
  };

  const updateCommentsVisibility = async (visibility: 'public' | 'friends' | 'private') => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ comments_visibility: visibility })
        .eq('id', user.id);
      if (error) throw error;
      setCommentsVisibility(visibility);
      Alert.alert('Éxito', 'Configuración de privacidad de comentarios actualizada');
    } catch (error) {
      console.error('Error al actualizar configuración de privacidad de comentarios:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración de privacidad de comentarios');
    }
  };

  const pickImage = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Se requieren permisos', 'Se necesita acceso a la galería para seleccionar una imagen');
        return;
      }

      // Lanzar el selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      // Solicitar permisos de cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Se requieren permisos', 'Se necesita acceso a la cámara para tomar una foto');
        return;
      }

      // Lanzar la cámara
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleImageUpload = async (imageUri: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para cambiar tu foto de perfil');
      return;
    }

    try {
      setUploadingImage(true);

      // Subir la imagen a Cloudinary y actualizar en la base de datos
      const cloudinaryUrl = await updateProfilePicture(user.id, imageUri);

      // Actualizar el estado local
      setProfilePicUrl(cloudinaryUrl);

      // Actualizar el estado de Redux si es necesario
      // Asegurarse de que user y sus propiedades existan antes de actualizar
      if (user) {
        try {
          // Usar setUser en lugar de updateUser para actualizar el perfil
          dispatch(setUser({
            ...user,
            profile_pic_url: cloudinaryUrl
          }));
        } catch (reduxError) {
          console.error('Error al actualizar el estado Redux:', reduxError);
          // Continuar con el flujo aunque falle la actualización de Redux
        }
      }

      // Mostrar un mensaje de éxito más discreto
      console.log('Foto de perfil actualizada correctamente');
      // Mostrar un Alert sólo si todo funciona correctamente
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
    } catch (error: any) {
      console.error('Error al subir la imagen:', error);
      Alert.alert('Error', `No se pudo actualizar la foto de perfil: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Cambiar foto de perfil',
      'Selecciona una opción',
      [
        {
          text: 'Tomar foto',
          onPress: takePhoto
        },
        {
          text: 'Elegir de la galería',
          onPress: pickImage
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ]
    );
  };

  const handleLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      console.log('Iniciando proceso de cierre de sesión');

      // Primero cerramos la sesión en Supabase
      console.log('Cerrando sesión en Supabase');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error al cerrar sesión en Supabase:', signOutError);
        Alert.alert('Error', 'No se pudo cerrar la sesión en Supabase');
        return;
      }

      // Verificar que la sesión se haya cerrado correctamente
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Sesión aún activa, intentando cerrar nuevamente');
        await supabase.auth.signOut();
      }

      // Una vez que la sesión está cerrada, limpiamos el estado de Redux
      console.log('Limpiando estado de Redux');
      dispatch(logout());

      // Forzar la actualización del estado de autenticación
      dispatch(setAuthState('unauthenticated'));

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'Ocurrió un error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu contraseña actual' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Primero verificamos la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error al obtener la sesión:', sessionError);
        setMessage({ type: 'error', text: 'Error al verificar tu sesión. Por favor, intenta nuevamente.' });
        return;
      }

      if (!session) {
        // Si no hay sesión, intentamos iniciar sesión con las credenciales actuales
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword
        });

        if (signInError) {
          console.error('Error al verificar contraseña:', signInError);
          setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
          return;
        }

        if (!signInData.session) {
          setMessage({ type: 'error', text: 'No se pudo iniciar sesión. Por favor, intenta nuevamente.' });
          return;
        }

        // Ahora intentamos actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          console.error('Error al actualizar contraseña:', updateError);
          setMessage({ type: 'error', text: 'No se pudo actualizar la contraseña: ' + updateError.message });
          return;
        }

        // Limpiamos el formulario
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Tu contraseña ha sido actualizada correctamente' });

        // Cerramos el modal después de 2 segundos
        setTimeout(() => {
          setIsChangePasswordVisible(false);
          setMessage({ type: '', text: '' });
        }, 2000);

        return;
      }

      // Si hay sesión activa, verificamos la contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        console.error('Error al verificar contraseña:', signInError);
        setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
        return;
      }

      // Si la contraseña es correcta, actualizamos a la nueva
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Error al actualizar contraseña:', updateError);
        setMessage({ type: 'error', text: 'No se pudo actualizar la contraseña: ' + updateError.message });
        return;
      }

      // Limpiamos el formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Tu contraseña ha sido actualizada correctamente' });

      // Cerramos el modal después de 2 segundos
      setTimeout(() => {
        setIsChangePasswordVisible(false);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      setMessage({ type: 'error', text: 'Ocurrió un error al intentar cambiar la contraseña. Por favor, intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    if (!user?.id) return;
    try {
      const userBadges = await getUserBadges(user.id);
      setBadges(userBadges || []);
    } catch (e) {
      setBadges([]);
    }
  };

  const fetchCurrentTitle = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('users')
      .select('custom_title')
      .eq('id', user.id)
      .single();
    if (!error && data?.custom_title) {
      setSelectedTitle(data.custom_title);
    }
  };

  const handleSaveTitle = async () => {
    if (!user?.id) return;
    setSavingTitle(true);
    const { error } = await supabase
      .from('users')
      .update({ custom_title: selectedTitle })
      .eq('id', user.id);
    setSavingTitle(false);
    if (!error) {
      Alert.alert('Éxito', 'Título actualizado');
    } else {
      Alert.alert('Error', 'No se pudo actualizar el título');
    }
  };

  const fetchAdvancedStats = async () => {
    if (!user?.id) return;

    try {
      setLoadingAdvancedStats(true);
      const stats = await getAdvancedMissionStats(user.id);
      setAdvancedStats(stats);
    } catch (error) {
      console.error('Error al obtener estadísticas avanzadas:', error);
      // No mostrar alerta para evitar interrumpir la experiencia del usuario
    } finally {
      setLoadingAdvancedStats(false);
    }
  };

  // Funciones de estilos para el modal de cambio de contraseña
  const getModalContentStyle = () => ({
    backgroundColor: colors.surface,
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  });
  const getModalTitleStyle = () => ({
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: colors.text.primary,
    letterSpacing: 1,
  });
  const getInputStyle = () => ({
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    backgroundColor: colors.surface,
    color: colors.text.primary,
    fontSize: 16,
  });
  const getCancelButtonStyle = () => ({
    backgroundColor: colors.error,
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  });
  const getSaveButtonStyle = () => ({
    backgroundColor: colors.primary,
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  });
  const getModalButtonTextStyle = () => ({
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView>
        {/* Header con foto de perfil y nivel */}
        <View style={[styles.headerBackground, { backgroundColor: isDarkMode ? colors.surface : colors.primary }]}>
          <View style={styles.header}>
            <TouchableOpacity style={[
              styles.avatarContainer,
              isDarkMode
                ? { backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }
                : { backgroundColor: colors.surface, borderColor: colors.primary }
            ]} onPress={showImageOptions}>
              {uploadingImage ? (
                <View style={styles.avatar}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={[styles.avatarText, { color: isDarkMode ? colors.accent : colors.primary }]}>{user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
                </View>
              )}
              <View style={[styles.cameraIconContainer, { backgroundColor: isDarkMode ? colors.accent : colors.primary, borderColor: isDarkMode ? colors.surface : colors.surface }]}>
                <Ionicons name="camera" size={20} color={isDarkMode ? colors.surface : colors.surface} />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              {selectedTitle ? (
                <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>{selectedTitle}</Text>
              ) : null}
              <Text style={[styles.name, { color: isDarkMode ? colors.accent : '#FFF' }]}>{user?.username || 'Usuario'}</Text>
              <Text style={{ color: isDarkMode ? colors.accent : '#FFF', fontSize: 15, marginBottom: 6 }}>{user?.email}</Text>
              <View style={[styles.levelContainer,
              isDarkMode
                ? { backgroundColor: colors.surface, borderColor: colors.accent }
                : { backgroundColor: colors.surface, borderColor: colors.primary }
              ]}>
                <Text style={{ color: isDarkMode ? colors.accent : colors.primary, fontWeight: 'bold', fontSize: 15 }}>Nivel {level}</Text>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginVertical: 5, width: '100%', overflow: 'hidden' }}>
                  <View style={{
                    height: 8,
                    backgroundColor: isDarkMode ? colors.accent : '#4CB6F7',
                    borderRadius: 4,
                    width: `${(xp / xpNext) * 100}%`
                  }} />
                </View>
                <Text style={{ color: colors.text.secondary, fontSize: 12, textAlign: 'right' }}>{xp}/{xpNext} XP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Estadísticas principales */}
        <View style={[
          styles.statsSummaryCard,
          { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9', borderRadius: 18, padding: 18, marginHorizontal: 10, marginTop: 18 }
        ]}>
          <View style={{ backgroundColor: isDarkMode ? colors.surface : '#FFF', borderRadius: 18, padding: 18, marginVertical: 18, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            {loadingStats ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size={40} color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: isDarkMode ? '#FFF' : colors.primary, textShadowColor: isDarkMode ? 'rgba(0,0,0,0.18)' : 'transparent', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: isDarkMode ? 2 : 0 }}>{realPoints}</Text>
                  <Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.85)' : colors.text.primary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginTop: 2 }}>PUNTOS</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: isDarkMode ? '#FFF' : colors.primary, textShadowColor: isDarkMode ? 'rgba(0,0,0,0.18)' : 'transparent', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: isDarkMode ? 2 : 0 }}>{stats.completedMissions}</Text>
                  <Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.85)' : colors.text.primary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginTop: 2 }}>MISIONES</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: isDarkMode ? '#FFF' : colors.primary, textShadowColor: isDarkMode ? 'rgba(0,0,0,0.18)' : 'transparent', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: isDarkMode ? 2 : 0 }}>{stats.visitedCities}</Text>
                  <Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.85)' : colors.text.primary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginTop: 2 }}>CIUDADES</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Social */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Social</Text>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Gestiona tus amigos y compite en el ranking.</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[styles.socialButton, isDarkMode
                ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent, shadowColor: 'transparent' }
                : { backgroundColor: colors.primary, borderWidth: 0, shadowColor: 'transparent' }
              ]}
              onPress={() => navigation.navigate('Friends')}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="people" size={24} color={isDarkMode ? colors.accent : colors.surface} />
                <Text style={[styles.socialButtonText, { color: isDarkMode ? colors.accent : colors.surface }]}>Amigos</Text>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? colors.accent : colors.surface} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, isDarkMode
                ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent, shadowColor: 'transparent' }
                : { backgroundColor: colors.primary, borderWidth: 0, shadowColor: 'transparent' }
              ]}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="trophy" size={24} color={isDarkMode ? colors.accent : colors.surface} />
                <Text style={[styles.socialButtonText, { color: isDarkMode ? colors.accent : colors.surface }]}>Leaderboard</Text>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? colors.accent : colors.surface} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logros */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Logros</Text>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Revisa tus insignias obtenidas.</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[styles.badgesButton, { backgroundColor: isDarkMode ? colors.surface : colors.primary, borderWidth: isDarkMode ? 1 : 0, borderColor: isDarkMode ? colors.accent : 'transparent', shadowColor: 'transparent' }]}
              onPress={() => navigation.navigate('BadgesScreen')}
            >
              <View style={styles.badgesButtonContent}>
                <Ionicons name="medal" size={24} color={isDarkMode ? colors.accent : colors.surface} />
                <Text style={[styles.badgesButtonText, { color: isDarkMode ? colors.accent : colors.surface }]}>Ver Mis Insignias</Text>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? colors.accent : colors.surface} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacidad */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowPrivacySettings(!showPrivacySettings)}
          >
            <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Privacidad</Text>
            <Ionicons
              name={showPrivacySettings ? "chevron-up" : "chevron-down"}
              size={24}
              color={isDarkMode ? colors.accent : colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Controla la visibilidad de tu perfil.</Text>
          {showPrivacySettings && (
            <View style={styles.privacyContainer}>
              {/* Visibilidad del perfil */}
              <View style={[styles.privacySection, { backgroundColor: colors.surface, padding: 12 }]}>
                <Text style={[styles.privacyDescription, { color: colors.text.primary }]}>Quién puede ver tu perfil</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (profileVisibility === 'public' ? colors.accent : 'transparent')
                        : (profileVisibility === 'public' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateProfileVisibility('public')}
                  >
                    <Ionicons name="globe-outline" size={20} color={isDarkMode ? (profileVisibility === 'public' ? '#181C22' : colors.accent) : (profileVisibility === 'public' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (profileVisibility === 'public' ? '#181C22' : colors.accent) : (profileVisibility === 'public' ? colors.white : colors.primary) }]}>Público</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (profileVisibility === 'friends' ? colors.accent : 'transparent')
                        : (profileVisibility === 'friends' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateProfileVisibility('friends')}
                  >
                    <Ionicons name="people-outline" size={20} color={isDarkMode ? (profileVisibility === 'friends' ? '#181C22' : colors.accent) : (profileVisibility === 'friends' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (profileVisibility === 'friends' ? '#181C22' : colors.accent) : (profileVisibility === 'friends' ? colors.white : colors.primary) }]}>Solo amigos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (profileVisibility === 'private' ? colors.accent : 'transparent')
                        : (profileVisibility === 'private' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateProfileVisibility('private')}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={isDarkMode ? (profileVisibility === 'private' ? '#181C22' : colors.accent) : (profileVisibility === 'private' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (profileVisibility === 'private' ? '#181C22' : colors.accent) : (profileVisibility === 'private' ? colors.white : colors.primary) }]}>Privado</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Visibilidad de amigos */}
              <View style={[styles.privacySection, { backgroundColor: colors.surface, padding: 12, marginTop: 12 }]}>
                <Text style={[styles.privacyDescription, { color: colors.text.primary }]}>Quién puede ver tu lista de amigos</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (friendsVisibility === 'public' ? colors.accent : 'transparent')
                        : (friendsVisibility === 'public' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateFriendsVisibility('public')}
                  >
                    <Ionicons name="globe-outline" size={20} color={isDarkMode ? (friendsVisibility === 'public' ? '#181C22' : colors.accent) : (friendsVisibility === 'public' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (friendsVisibility === 'public' ? '#181C22' : colors.accent) : (friendsVisibility === 'public' ? colors.white : colors.primary) }]}>Público</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (friendsVisibility === 'friends' ? colors.accent : 'transparent')
                        : (friendsVisibility === 'friends' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateFriendsVisibility('friends')}
                  >
                    <Ionicons name="people-outline" size={20} color={isDarkMode ? (friendsVisibility === 'friends' ? '#181C22' : colors.accent) : (friendsVisibility === 'friends' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (friendsVisibility === 'friends' ? '#181C22' : colors.accent) : (friendsVisibility === 'friends' ? colors.white : colors.primary) }]}>Solo amigos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (friendsVisibility === 'private' ? colors.accent : 'transparent')
                        : (friendsVisibility === 'private' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateFriendsVisibility('private')}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={isDarkMode ? (friendsVisibility === 'private' ? '#181C22' : colors.accent) : (friendsVisibility === 'private' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (friendsVisibility === 'private' ? '#181C22' : colors.accent) : (friendsVisibility === 'private' ? colors.white : colors.primary) }]}>Solo tú</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Visibilidad de comentarios */}
              <View style={[styles.privacySection, { backgroundColor: colors.surface, padding: 12, marginTop: 12 }]}>
                <Text style={[styles.privacyDescription, { color: colors.text.primary }]}>Quién puede comentar en tus entradas</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (commentsVisibility === 'public' ? colors.accent : 'transparent')
                        : (commentsVisibility === 'public' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateCommentsVisibility('public')}
                  >
                    <Ionicons name="globe-outline" size={20} color={isDarkMode ? (commentsVisibility === 'public' ? '#181C22' : colors.accent) : (commentsVisibility === 'public' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (commentsVisibility === 'public' ? '#181C22' : colors.accent) : (commentsVisibility === 'public' ? colors.white : colors.primary) }]}>Público</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (commentsVisibility === 'friends' ? colors.accent : 'transparent')
                        : (commentsVisibility === 'friends' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateCommentsVisibility('friends')}
                  >
                    <Ionicons name="people-outline" size={20} color={isDarkMode ? (commentsVisibility === 'friends' ? '#181C22' : colors.accent) : (commentsVisibility === 'friends' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (commentsVisibility === 'friends' ? '#181C22' : colors.accent) : (commentsVisibility === 'friends' ? colors.white : colors.primary) }]}>Solo amigos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.privacyRadio, {
                      backgroundColor: isDarkMode
                        ? (commentsVisibility === 'private' ? colors.accent : 'transparent')
                        : (commentsVisibility === 'private' ? colors.primary : colors.white),
                      borderColor: isDarkMode ? colors.accent : colors.primary,
                    }]}
                    onPress={() => updateCommentsVisibility('private')}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={isDarkMode ? (commentsVisibility === 'private' ? '#181C22' : colors.accent) : (commentsVisibility === 'private' ? colors.white : colors.primary)} />
                    <Text style={[styles.privacyRadioText, { color: isDarkMode ? (commentsVisibility === 'private' ? '#181C22' : colors.accent) : (commentsVisibility === 'private' ? colors.white : colors.primary) }]}>Nadie</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Apariencia */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Apariencia</Text>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Cambia entre modo claro y oscuro.</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? colors.accent : colors.primary }]}
              onPress={toggleTheme}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons
                  name={isDarkMode ? "sunny" : "moon"}
                  size={24}
                  color={isDarkMode ? '#181C22' : colors.surface}
                />
                <Text style={[styles.socialButtonText, { color: isDarkMode ? '#181C22' : colors.surface }]}>
                  {isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#181C22' : colors.surface} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.socialDescription, { color: colors.text.secondary }]}>Personaliza la apariencia de la aplicación</Text>
          </View>
        </View>

        {/* Estadísticas Avanzadas */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowAdvancedStats(!showAdvancedStats)}
          >
            <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Estadísticas Avanzadas</Text>
            <Ionicons
              name={showAdvancedStats ? "chevron-up" : "chevron-down"}
              size={24}
              color={isDarkMode ? colors.accent : colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Analiza tu progreso en detalle.</Text>
          {showAdvancedStats && (
            <View style={[styles.advancedStatsContainer, { backgroundColor: isDarkMode ? colors.surface : '#f5f5f5' }]}>
              {loadingAdvancedStats ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : advancedStats ? (
                <>
                  {/* Información de estado de misiones */}
                  <View style={styles.missionStatusSection}>
                    <View style={styles.missionStatusRow}>
                      <View style={styles.missionStatusItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[
                          styles.missionStatusCount,
                          { color: isDarkMode ? colors.accent : '#4CAF50' }
                        ]}>{advancedStats.completedMissions}</Text>
                        <Text style={[
                          styles.missionStatusLabel,
                          { color: isDarkMode ? colors.accent : '#4CAF50' }
                        ]}>Completadas</Text>
                      </View>

                      <View style={styles.missionStatusItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#FF9800' }]} />
                        <Text style={[
                          styles.missionStatusCount,
                          { color: isDarkMode ? colors.accent : '#FF9800' }
                        ]}>{advancedStats.pendingMissions}</Text>
                        <Text style={[
                          styles.missionStatusLabel,
                          { color: isDarkMode ? colors.accent : '#FF9800' }
                        ]}>Pendientes</Text>
                      </View>

                      <View style={styles.missionStatusItem}>
                        <View style={[styles.colorBox, { backgroundColor: '#F44336' }]} />
                        <Text style={[
                          styles.missionStatusCount,
                          { color: isDarkMode ? colors.accent : '#F44336' }
                        ]}>{advancedStats.expiredMissions}</Text>
                        <Text style={[
                          styles.missionStatusLabel,
                          { color: isDarkMode ? colors.accent : '#F44336' }
                        ]}>Expiradas</Text>
                      </View>
                    </View>
                  </View>

                  {/* Top 3 ciudades con más misiones */}
                  {advancedStats.topCities && advancedStats.topCities.length > 0 && (
                    <View style={[
                      styles.topCitiesSection,
                      { backgroundColor: isDarkMode ? colors.surface : '#F7F7F7' }
                    ]}>
                      <Text style={[styles.topCitiesTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Top Ciudades</Text>

                      {advancedStats.topCities.map((city, index) => (
                        <View key={city.name} style={[
                          styles.topCityItem,
                          { backgroundColor: isDarkMode ? colors.surface : '#F7F7F7' }
                        ]}>
                          <View style={[
                            styles.topCityRank,
                            { backgroundColor: isDarkMode ? (index === 0 ? colors.accent : colors.surface) : (index === 0 ? '#FFD700' : '#005F9E') }
                          ]}>
                            <Text style={[
                              styles.topCityRankText,
                              { color: isDarkMode ? (index === 0 ? '#181C22' : colors.accent) : '#fff' }
                            ]}>{index + 1}</Text>
                          </View>
                          <View style={styles.topCityInfo}>
                            <Text style={[
                              styles.topCityName,
                              { color: isDarkMode ? (index === 0 ? colors.accent : colors.text.primary) : '#333' }
                            ]}>{city.name}</Text>
                            <View style={styles.topCityBarContainer}>
                              <View
                                style={[
                                  styles.topCityBar,
                                  {
                                    width: `${Math.min(100, (city.count / (advancedStats.topCities[0]?.count || 1)) * 100)}%`,
                                    backgroundColor: isDarkMode ? (index === 0 ? colors.accent : colors.text.secondary) : '#E0E0E0'
                                  }
                                ]}
                              />
                            </View>
                            <Text style={[
                              styles.topCityCount,
                              { color: isDarkMode ? (index === 0 ? colors.accent : colors.text.secondary) : '#666' }
                            ]}>{city.count} misiones</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Estadísticas detalladas */}
                  <View style={styles.detailedStats}>
                    <View style={styles.statRow}>
                      <Text style={[styles.statTitle, { color: isDarkMode ? colors.accent : '#333' }]}>Puntos ganados en misiones:</Text>
                      <Text style={[styles.statDetail, { color: isDarkMode ? colors.accent : '#005F9E' }]}>{advancedStats.pointsEarned}</Text>
                    </View>

                    <View style={styles.statRow}>
                      <Text style={[styles.statTitle, { color: isDarkMode ? colors.accent : '#333' }]}>Tiempo promedio para completar:</Text>
                      <Text style={[styles.statDetail, { color: isDarkMode ? colors.accent : '#005F9E' }]}>{advancedStats.averageTimeToComplete} días</Text>
                    </View>

                    <View style={styles.statRow}>
                      <Text style={[styles.statTitle, { color: isDarkMode ? colors.accent : '#333' }]}>Categoría más completada:</Text>
                      <Text style={[styles.statDetail, { color: isDarkMode ? colors.accent : '#005F9E' }]}>{advancedStats.mostCompletedCategory}</Text>
                    </View>

                    {/* Resumen por categorías */}
                    <Text style={[styles.categoryTitle, { color: isDarkMode ? colors.accent : '#333' }]}>Misiones completadas por categoría:</Text>
                    {Object.entries(advancedStats.completedByCategory).map(([category, count]) => (
                      <View key={category} style={styles.categoryRow}>
                        <Text style={[styles.categoryName, { color: isDarkMode ? colors.accent : '#333' }]}>{category}</Text>
                        <View style={styles.categoryBar}>
                          <View
                            style={[
                              styles.categoryFill,
                              {
                                width: `${(count / advancedStats.completedMissions) * 100}%`,
                                backgroundColor: isDarkMode ? colors.accent : getCategoryColor(category)
                              }
                            ]}
                          />
                        </View>
                        <Text style={[styles.categoryCount, { color: isDarkMode ? colors.accent : '#333' }]}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={[styles.noStatsText, { color: colors.text.secondary }]}>No hay suficientes datos para mostrar estadísticas avanzadas.</Text>
              )}
            </View>
          )}
        </View>

        {/* Seguridad */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? colors.surface : '#EDF6F9' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.accent : colors.primary }]}>Seguridad</Text>
          <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>Cambia tu contraseña.</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? colors.accent : colors.primary }]}
              onPress={() => setIsChangePasswordVisible(true)}
            >
              <Text style={[styles.socialButtonText, { color: colors.surface }]}>Cambiar Contraseña</Text>
            </TouchableOpacity>
            <Text style={[styles.privacyDescription, { color: colors.text.secondary }]}>Actualiza tu contraseña para mantener tu cuenta segura</Text>
          </View>
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
          disabled={loading}
        >
          <Text style={[styles.logoutButtonText, { color: colors.surface }]}>
            {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </Text>
        </TouchableOpacity>

        {/* Modal de cambio de contraseña */}
        <Modal
          visible={isChangePasswordVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={getModalContentStyle()}>
              <Text style={getModalTitleStyle()}>Cambiar Contraseña</Text>

              {message.text ? (
                <Text style={[styles.messageText, message.type === 'error' ? styles.errorMessage : styles.successMessage]}>
                  {message.text}
                </Text>
              ) : null}

              <TextInput
                style={getInputStyle()}
                placeholder="Contraseña actual"
                placeholderTextColor={isDarkMode ? '#A9D6E5' : colors.text.secondary}
                secureTextEntry
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <TextInput
                style={getInputStyle()}
                placeholder="Nueva contraseña"
                placeholderTextColor={isDarkMode ? '#A9D6E5' : colors.text.secondary}
                secureTextEntry
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <TextInput
                style={getInputStyle()}
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor={isDarkMode ? '#A9D6E5' : colors.text.secondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={getCancelButtonStyle()}
                  onPress={() => {
                    setIsChangePasswordVisible(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setMessage({ type: '', text: '' });
                  }}
                >
                  <Text style={getModalButtonTextStyle()}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[getSaveButtonStyle(), loading && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={getModalButtonTextStyle()}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

// Función para obtener colores para las categorías
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'cultura': '#8E44AD',     // Morado
    'arte': '#9B59B6',        // Púrpura
    'food': '#2ECC71',        // Verde
    'gastronomía': '#27AE60', // Verde oscuro
    'naturaleza': '#27AE60',  // Verde oscuro
    'aventura': '#E74C3C',    // Rojo
    'historia': '#D35400',    // Naranja oscuro
    'arquitectura': '#3498DB', // Azul
    'fotografía': '#1ABC9C',   // Verde agua
    'compras': '#F39C12',     // Ámbar
    'social': '#16A085',      // Verde azulado
  };

  return colors[category.toLowerCase()] || '#F39C12'; // Naranja por defecto
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
    backgroundColor: '#274472',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#EDF6F9',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDF6F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#274472',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EDF6F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#EDF6F9',
  },
  userInfo: {
    flex: 1,
    padding: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EDF6F9',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#EDF6F9',
    marginBottom: 10,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#274472',
    marginTop: -30,
    marginHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EDF6F9',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#EDF6F9',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    Color: '#274472',
    letterSpacing: 1,
  },
  privacyContainer: {
    borderRadius: 10,
    padding: 15,
  },
  privacyButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EDF6F9',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#EDF6F9',
    textAlign: 'center',
  },
  levelContainer: {
    marginTop: 10,
    backgroundColor: '#274472',
    padding: 10,
    borderRadius: 15,
  },
  levelText: {
    color: '#EDF6F9',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1B263B',
    borderRadius: 4,
    marginVertical: 5,
    width: '100%',
    overflow: 'hidden',
  },
  progress: {
    height: 8,
    backgroundColor: '#41729F',
    borderRadius: 4,
  },
  xpText: {
    color: '#EDF6F9',
    fontSize: 12,
    textAlign: 'right',
  },
  socialButton: {
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButtonText: {
    color: '#EDF6F9',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  privacyRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#70C1B3',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    backgroundColor: '#EDF6F9',
    minWidth: 90,
    flexGrow: 1,
    marginVertical: 4,
    flexBasis: '30%',
    justifyContent: 'center',
  },
  privacyRadioSelected: {
    backgroundColor: '#70C1B3',
  },
  privacyRadioText: {
    marginLeft: 6,
    color: '#274472',
    fontWeight: 'bold',
  },
  privacyRadioTextSelected: {
    color: '#EDF6F9',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#F44336',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  logoutButtonText: {
    color: '#EDF6F9',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    // El color de fondo del modal ahora se maneja solo con getModalContentStyle()
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    // El color del título ahora se maneja solo con getModalTitleStyle()
    letterSpacing: 1,
  },
  input: {
    borderWidth: 2,
    // El color del borde y fondo ahora se maneja solo con getInputStyle()
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    // El color de fondo y texto ahora se maneja solo con getInputStyle()
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    // El color del botón cancelar ahora se maneja solo con getCancelButtonStyle()
  },
  saveButton: {
    // El color del botón guardar ahora se maneja solo con getSaveButtonStyle()
  },
  modalButtonText: {
    // El color del texto del botón ahora se maneja solo con getModalButtonTextStyle()
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  successMessage: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  disabledButton: {
    opacity: 0.7,
  },
  customTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#669BBC',
    marginBottom: 5,
    textAlign: 'center',
    letterSpacing: 1,
  },
  badgesButton: {
    backgroundColor: '#274472',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  badgesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badgesButtonText: {
    color: '#EDF6F9',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 1,
  },
  socialDescription: {
    marginTop: 6,
    marginBottom: 0,
    fontSize: 14,
    color: '#EDF6F9',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  advancedStatsContainer: {
    marginTop: 15,
    borderRadius: 10,
    padding: 15,
  },
  loader: {
    marginVertical: 20,
  },
  noStatsText: {
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  missionStatusSection: {
    marginBottom: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
  },
  missionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  missionStatusItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  missionStatusCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  missionStatusLabel: {
    fontSize: 12,
    color: '#666',
  },
  colorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  topCitiesSection: {
    marginTop: 25,
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  topCitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  topCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topCityRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topCityRankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  topCityInfo: {
    flex: 1,
  },
  topCityName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  topCityBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  topCityBar: {
    height: '100%',
    borderRadius: 4,
  },
  topCityCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  detailedStats: {
    marginTop: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#333',
    flex: 3,
  },
  statDetail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#005F9E',
    flex: 1,
    textAlign: 'right',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  categoryName: {
    width: 100,
    fontSize: 14,
    color: '#333',
  },
  categoryBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 6,
  },
  categoryCount: {
    width: 30,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  privacySection: {
    backgroundColor: '#274472',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  darkContainer: {
    backgroundColor: '#1B263B',
  },
  darkSection: {
    backgroundColor: '#274472',
  },
  darkButton: {
    backgroundColor: '#41729F',
  },
  darkText: {
    color: '#EDF6F9',
  },
  sectionDescription: {
    marginTop: 6,
    marginBottom: 0,
    fontSize: 14,
    color: '#EDF6F9',
    letterSpacing: 0.5,
  },
  statsSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen; 