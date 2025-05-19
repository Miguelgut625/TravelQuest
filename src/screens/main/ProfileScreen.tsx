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
  const [badges, setBadges] = useState<any[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [realPoints, setRealPoints] = useState(0);

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
        .select('profile_visibility, friends_visibility')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfileVisibility(data?.profile_visibility || 'public');
      setFriendsVisibility(data?.friends_visibility || 'public');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.headerBackground}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.avatarContainer} onPress={showImageOptions}>
              {uploadingImage ? (
                <View style={styles.avatar}>
                  <ActivityIndicator size="large" color="white" />
                </View>
              ) : profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              {user?.custom_title ? (
                <Text style={styles.customTitle}>{user.custom_title}</Text>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size={40} color="#005F9E" />
            </View>
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

        {/* Social */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => navigation.navigate('Friends')}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.socialButtonText}>Amigos</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.privacyDescription, styles.socialDescription]}>
              Conéctate con tus amigos
            </Text>

            <TouchableOpacity
              style={[styles.socialButton, styles.secondSocialButton]}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="trophy" size={24} color="white" />
                <Text style={styles.socialButtonText}>Leaderboard</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.privacyDescription, styles.socialDescription]}>
              Mira el ranking de puntos
            </Text>
          </View>
        </View>

        {/* Logros/Insignias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logros</Text>
          <View style={styles.badgesContainer}>
            <TouchableOpacity
              style={styles.badgesButton}
              onPress={() => {
                navigation.navigate('BadgesScreen');
              }}
            >
              <View style={styles.badgesButtonContent}>
                <Ionicons name="medal" size={24} color="white" />
                <Text style={styles.badgesButtonText}>Ver Mis Insignias</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          {/* Visibilidad del perfil */}
          <View style={[styles.privacyContainer, { marginBottom: 16 }]}>
            <Text style={[styles.privacyDescription, { marginBottom: 8 }]}>Quién puede ver tu perfil</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.privacyRadio, profileVisibility === 'public' && styles.privacyRadioSelected]}
                onPress={() => updateProfileVisibility('public')}
              >
                <Ionicons name="globe-outline" size={20} color={profileVisibility === 'public' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, profileVisibility === 'public' && styles.privacyRadioTextSelected]}>Público</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyRadio, profileVisibility === 'friends' && styles.privacyRadioSelected]}
                onPress={() => updateProfileVisibility('friends')}
              >
                <Ionicons name="people-outline" size={20} color={profileVisibility === 'friends' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, profileVisibility === 'friends' && styles.privacyRadioTextSelected]}>Solo amigos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyRadio, profileVisibility === 'private' && styles.privacyRadioSelected]}
                onPress={() => updateProfileVisibility('private')}
              >
                <Ionicons name="lock-closed-outline" size={20} color={profileVisibility === 'private' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, profileVisibility === 'private' && styles.privacyRadioTextSelected]}>Privado</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Visibilidad de amigos */}
          <View style={styles.privacyContainer}>
            <Text style={[styles.privacyDescription, { marginBottom: 8 }]}>Quién puede ver tu lista de amigos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.privacyRadio, friendsVisibility === 'public' && styles.privacyRadioSelected]}
                onPress={() => updateFriendsVisibility('public')}
              >
                <Ionicons name="globe-outline" size={20} color={friendsVisibility === 'public' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, friendsVisibility === 'public' && styles.privacyRadioTextSelected]}>Público</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyRadio, friendsVisibility === 'friends' && styles.privacyRadioSelected]}
                onPress={() => updateFriendsVisibility('friends')}
              >
                <Ionicons name="people-outline" size={20} color={friendsVisibility === 'friends' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, friendsVisibility === 'friends' && styles.privacyRadioTextSelected]}>Solo amigos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyRadio, friendsVisibility === 'private' && styles.privacyRadioSelected]}
                onPress={() => updateFriendsVisibility('private')}
              >
                <Ionicons name="lock-closed-outline" size={20} color={friendsVisibility === 'private' ? 'white' : '#005F9E'} />
                <Text style={[styles.privacyRadioText, friendsVisibility === 'private' && styles.privacyRadioTextSelected]}>Solo tú</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Seguridad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={styles.privacyButton}
              onPress={() => setIsChangePasswordVisible(true)}
            >
              <Text style={styles.privacyButtonText}>Cambiar Contraseña</Text>
            </TouchableOpacity>
            <Text style={styles.privacyDescription}>
              Actualiza tu contraseña para mantener tu cuenta segura
            </Text>
          </View>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[styles.logoutButton, loading && styles.disabledButton]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBackground: {
    backgroundColor: '#005F9E',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#005F9E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#005F9E',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
    padding: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  privacyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    padding: 15,
  },
  privacyButton: {
    backgroundColor: '#005F9E',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  levelContainer: {
    marginTop: 5,
  },
  levelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginVertical: 5,
    width: '100%',
  },
  progress: {
    height: 6,
    backgroundColor: '#FFB74D',
    borderRadius: 3,
  },
  xpText: {
    color: '#fff',
    fontSize: 12,
  },
  badgesButton: {
    backgroundColor: '#005F9E',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  badgesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  privacyRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#005F9E',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    backgroundColor: 'white',
    minWidth: 90,
    flexGrow: 1,
    marginVertical: 4,
    flexBasis: '30%',
    justifyContent: 'center',
  },
  privacyRadioSelected: {
    backgroundColor: '#005F9E',
  },
  privacyRadioText: {
    marginLeft: 6,
    color: '#005F9E',
    fontWeight: 'bold',
  },
  privacyRadioTextSelected: {
    color: 'white',
  },
  customTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7F5AF0',
    marginBottom: 2,
  },
  socialButton: {
    backgroundColor: '#005F9E',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  secondSocialButton: {
    marginTop: 20,
    marginBottom: 4,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  socialDescription: {
    marginTop: 4,
    marginBottom: 0,
    fontSize: 13,
    color: '#666',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
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
});

export default ProfileScreen; 