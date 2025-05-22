import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView, FlatList, Platform } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
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
import { getAdvancedMissionStats, AdvancedMissionStats } from '../../services/statisticsService';
import { useThemeContext } from '../../context/ThemeContext';
import { commonStyles } from '../../styles/theme';

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
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeContext();

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerBackground: {
      backgroundColor: theme.colors.primary,
      paddingTop: commonStyles.spacing.xl,
      paddingBottom: commonStyles.spacing.xl * 2,
      borderBottomLeftRadius: commonStyles.borderRadius.large * 2,
      borderBottomRightRadius: commonStyles.borderRadius.large * 2,
      ...commonStyles.shadow.light,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: commonStyles.spacing.lg,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: commonStyles.spacing.lg,
      borderWidth: 3,
      borderColor: theme.colors.tertiary,
      borderRadius: commonStyles.borderRadius.round,
      ...commonStyles.shadow.medium,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: commonStyles.borderRadius.round,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    cameraIconContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.secondary,
      borderRadius: commonStyles.borderRadius.round,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.surface,
      ...commonStyles.shadow.small,
    },
    avatarText: {
      ...commonStyles.typography.h1,
      color: theme.colors.primary,
    },
    userInfo: {
      flex: 1,
      padding: commonStyles.spacing.md,
    },
    name: {
      ...commonStyles.typography.h1,
      color: theme.colors.onPrimary,
      marginBottom: commonStyles.spacing.xs,
    },
    email: {
      ...commonStyles.typography.body,
      color: theme.colors.onPrimary,
      opacity: 0.9,
      marginBottom: commonStyles.spacing.md,
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.surface,
      marginTop: -commonStyles.spacing.xl,
      marginHorizontal: commonStyles.spacing.lg,
      borderRadius: commonStyles.borderRadius.large,
      padding: commonStyles.spacing.lg,
      ...commonStyles.shadow.medium,
    },
    statItem: {
      alignItems: 'center',
      padding: commonStyles.spacing.md,
    },
    statValue: {
      ...commonStyles.typography.h2,
      color: theme.colors.primary,
      marginBottom: commonStyles.spacing.xs,
    },
    statLabel: {
      ...commonStyles.typography.caption,
      color: theme.colors.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    section: {
      ...commonStyles.components.card,
      backgroundColor: theme.colors.surface,
      marginTop: commonStyles.spacing.lg,
    },
    sectionTitle: {
      ...commonStyles.typography.h3,
      color: theme.colors.primary,
      marginBottom: commonStyles.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    levelContainer: {
      marginTop: commonStyles.spacing.md,
      backgroundColor: theme.colors.tertiary,
      padding: commonStyles.spacing.md,
      borderRadius: commonStyles.borderRadius.medium,
      ...commonStyles.shadow.small,
    },
    levelText: {
      ...commonStyles.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
      marginBottom: commonStyles.spacing.xs,
    },
    progressBar: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: commonStyles.borderRadius.small,
      marginVertical: commonStyles.spacing.xs,
      overflow: 'hidden',
    },
    progress: {
      height: 8,
      backgroundColor: theme.colors.onPrimary,
      borderRadius: commonStyles.borderRadius.small,
    },
    xpText: {
      ...commonStyles.typography.caption,
      color: theme.colors.onPrimary,
      textAlign: 'right',
      opacity: 0.9,
    },
    socialButton: {
      ...commonStyles.components.button,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: commonStyles.spacing.lg,
    },
    socialButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    socialButtonText: {
      ...commonStyles.typography.body,
      color: theme.colors.onPrimary,
      marginLeft: commonStyles.spacing.md,
      fontWeight: '600',
    },
    privacyContainer: {
      marginTop: commonStyles.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: commonStyles.borderRadius.medium,
      padding: commonStyles.spacing.md,
      ...commonStyles.shadow.small,
    },
    privacyButton: {
      ...commonStyles.components.button,
      backgroundColor: theme.colors.secondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    privacyButtonText: {
      ...commonStyles.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    privacyDescription: {
      ...commonStyles.typography.caption,
      color: theme.colors.onSurface,
      opacity: 0.7,
      marginTop: commonStyles.spacing.xs,
      marginBottom: commonStyles.spacing.md,
    },
    privacyRadio: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      borderRadius: commonStyles.borderRadius.medium,
      paddingVertical: commonStyles.spacing.sm,
      paddingHorizontal: commonStyles.spacing.md,
      marginHorizontal: commonStyles.spacing.xs,
      backgroundColor: theme.colors.surface,
      minWidth: 90,
      flexGrow: 1,
      ...commonStyles.shadow.small,
    },
    privacyRadioSelected: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    privacyRadioText: {
      ...commonStyles.typography.caption,
      color: theme.colors.secondary,
      fontWeight: '600',
      marginLeft: commonStyles.spacing.sm,
    },
    privacyRadioTextSelected: {
      color: theme.colors.onPrimary,
    },
    privacyOptionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: commonStyles.spacing.sm,
      marginTop: commonStyles.spacing.sm,
    },
    privacyOption: {
      flex: 1,
      minWidth: '30%',
    },
    privacyLabel: {
      ...commonStyles.typography.caption,
      color: theme.colors.onSurface,
      marginBottom: commonStyles.spacing.sm,
      fontWeight: '500',
    },
    logoutButton: {
      ...commonStyles.components.button,
      backgroundColor: theme.colors.error,
      marginHorizontal: commonStyles.spacing.lg,
      marginBottom: commonStyles.spacing.xl,
    },
    logoutButtonText: {
      ...commonStyles.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContent: {
      backgroundColor: '#1B263B',
      padding: 25,
      borderRadius: 20,
      width: '90%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 25,
      textAlign: 'center',
      color: '#EDF6F9',
      letterSpacing: 1,
    },
    input: {
      borderWidth: 2,
      borderColor: '#41729F',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      backgroundColor: '#274472',
      color: '#EDF6F9',
      fontSize: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
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
    },
    cancelButton: {
      backgroundColor: '#F44336',
    },
    saveButton: {
      backgroundColor: '#669BBC',
    },
    modalButtonText: {
      color: '#EDF6F9',
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
      color: '#A9D6E5',
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
      backgroundColor: '#f5f5f5',
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
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.headerBackground}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.avatarContainer} onPress={showImageOptions}>
              {uploadingImage ? (
                <View style={styles.avatar}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color={theme.colors.onPrimary} />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              {selectedTitle ? (
                <Text style={[styles.customTitle, { color: theme.colors.tertiary }]}>
                  {selectedTitle}
                </Text>
              ) : null}
              <Text style={styles.name}>{user?.username || 'Usuario'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.levelContainer}>
                <Text style={styles.levelText}>Nivel {level}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: `${(xp / xpNext) * 100}%` }]} />
                </View>
                <Text style={styles.xpText}>{xp}/{xpNext} XP</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.stats}>
          {loadingStats ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{realPoints}</Text>
                <Text style={styles.statLabel}>Puntos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.completedMissions}</Text>
                <Text style={styles.statLabel}>Misiones</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.visitedCities}</Text>
                <Text style={styles.statLabel}>Ciudades</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => navigation.navigate('Friends')}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons name="people" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.socialButtonText}>Amigos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Conéctate con tus amigos y comparte tus aventuras
          </Text>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons name="trophy" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.socialButtonText}>Leaderboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Mira el ranking de puntos y compite con otros viajeros
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logros</Text>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => navigation.navigate('BadgesScreen')}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons name="medal" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.socialButtonText}>Ver Mis Insignias</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Descubre tus logros y colecciona insignias especiales
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          
          <View style={styles.privacyContainer}>
            <Text style={styles.privacyLabel}>Visibilidad del perfil</Text>
            <View style={styles.privacyOptionsContainer}>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, profileVisibility === 'public' && styles.privacyRadioSelected]}
                  onPress={() => updateProfileVisibility('public')}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={20} 
                    color={profileVisibility === 'public' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, profileVisibility === 'public' && styles.privacyRadioTextSelected]}>
                    Público
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, profileVisibility === 'friends' && styles.privacyRadioSelected]}
                  onPress={() => updateProfileVisibility('friends')}
                >
                  <Ionicons 
                    name="people-outline" 
                    size={20} 
                    color={profileVisibility === 'friends' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, profileVisibility === 'friends' && styles.privacyRadioTextSelected]}>
                    Amigos
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, profileVisibility === 'private' && styles.privacyRadioSelected]}
                  onPress={() => updateProfileVisibility('private')}
                >
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={profileVisibility === 'private' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, profileVisibility === 'private' && styles.privacyRadioTextSelected]}>
                    Privado
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.privacyContainer}>
            <Text style={styles.privacyLabel}>Visibilidad de amigos</Text>
            <View style={styles.privacyOptionsContainer}>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, friendsVisibility === 'public' && styles.privacyRadioSelected]}
                  onPress={() => updateFriendsVisibility('public')}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={20} 
                    color={friendsVisibility === 'public' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, friendsVisibility === 'public' && styles.privacyRadioTextSelected]}>
                    Público
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, friendsVisibility === 'friends' && styles.privacyRadioSelected]}
                  onPress={() => updateFriendsVisibility('friends')}
                >
                  <Ionicons 
                    name="people-outline" 
                    size={20} 
                    color={friendsVisibility === 'friends' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, friendsVisibility === 'friends' && styles.privacyRadioTextSelected]}>
                    Amigos
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.privacyOption}>
                <TouchableOpacity
                  style={[styles.privacyRadio, friendsVisibility === 'private' && styles.privacyRadioSelected]}
                  onPress={() => updateFriendsVisibility('private')}
                >
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={friendsVisibility === 'private' ? theme.colors.onPrimary : theme.colors.secondary} 
                  />
                  <Text style={[styles.privacyRadioText, friendsVisibility === 'private' && styles.privacyRadioTextSelected]}>
                    Solo tú
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => setIsChangePasswordVisible(true)}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.socialButtonText}>Cambiar Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Actualiza tu contraseña para mantener tu cuenta segura
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={toggleTheme}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons 
                name={isDarkMode ? "moon" : "sunny"} 
                size={24} 
                color={theme.colors.onPrimary} 
              />
              <Text style={styles.socialButtonText}>
                {isDarkMode ? "Modo Oscuro" : "Modo Claro"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Cambia entre tema claro y oscuro
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>
            {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={isChangePasswordVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>

              {message.text ? (
                <Text style={[styles.messageText, message.type === 'error' ? styles.errorMessage : styles.successMessage]}>
                  {message.text}
                </Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Contraseña actual"
                placeholderTextColor={theme.colors.onSurface}
                secureTextEntry
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                placeholderTextColor={theme.colors.onSurface}
                secureTextEntry
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor={theme.colors.onSurface}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsChangePasswordVisible(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setMessage({ type: '', text: '' });
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>
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

export default ProfileScreen; 