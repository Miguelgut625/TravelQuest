import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert, ActivityIndicator, ScrollView, FlatList, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../features/store';
import { logout, setAuthState } from '../features/authSlice';
import { supabase, ensureValidSession } from '../services/supabase';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

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
  users: {
    username: string;
  };
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
  const [friendshipRequests, setFriendshipRequests] = useState<FriendshipRequest[]>([]);
  const [isRequestsVisible, setIsRequestsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(0);

  useEffect(() => {
    fetchUserStats();
    
    // Verificar sesión válida para las suscripciones
    const setupRealtime = async () => {
      try {
        const { valid, session, error } = await ensureValidSession();
        if (!valid) {
          console.error('Sesión inválida para suscripciones en tiempo real:', error);
          Alert.alert('Error de sesión', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          dispatch(logout());
          return;
        }
        
        // Suscripción a cambios en journeys del usuario
        const journeysSubscription = supabase
          .channel('journeys-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'journeys',
              filter: `userId=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en journeys:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en las misiones del usuario
        const missionsSubscription = supabase
          .channel('journeys-missions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'journeys_missions'
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en misiones:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en challenges
        const challengesSubscription = supabase
          .channel('challenges-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'challenges'
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en challenges:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en el usuario (nivel, xp)
        const userStatsSubscription = supabase
          .channel('user-stats-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en stats de usuario:', payload);
              fetchUserStats();
            }
          )
          .subscribe();
          
        // Suscripción a cambios en solicitudes de amistad
        const friendshipSubscription = supabase
          .channel('friendship-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'friendship_invitations',
              filter: `receiverId=eq.${user?.id}`
            },
            // @ts-ignore - Ignorar error de tipado para el payload
            (payload) => {
              console.log('Cambio detectado en solicitudes de amistad:', payload);
              if (isRequestsVisible) {
                fetchPendingRequests().then(requests => setFriendshipRequests(requests));
              }
            }
          )
          .subscribe();
        
        // Limpieza de suscripciones
        return () => {
          console.log('Limpiando suscripciones de tiempo real');
          journeysSubscription.unsubscribe();
          missionsSubscription.unsubscribe();
          challengesSubscription.unsubscribe();
          userStatsSubscription.unsubscribe();
          friendshipSubscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error configurando suscripciones en tiempo real:', error);
      }
    };
    
    const cleanupFn = setupRealtime();
    
    return () => {
      if (cleanupFn && typeof cleanupFn.then === 'function') {
        cleanupFn.then(cleanup => {
          if (cleanup && typeof cleanup === 'function') {
            cleanup();
          }
        });
      }
    };
  }, [user?.id, isRequestsVisible, dispatch]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      // Verificar sesión válida antes de obtener estadísticas
      const { valid, error: sessionError } = await ensureValidSession();
      if (!valid) {
        console.error('Sesión inválida para obtener estadísticas:', sessionError);
        Alert.alert('Error de sesión', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        dispatch(logout());
        return;
      }
      
      setLoadingStats(true);
      console.log('Obteniendo estadísticas actualizadas...');

      // Obtener los datos del usuario (puntos, nivel, xp)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points, level, xp, xp_next')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Obtener los journeys del usuario con sus misiones completadas
      const { data: journeys, error: journeysError } = await supabase
        .from('journeys')
        .select(`id, cityId, journeys_missions!inner (completed, challenges!inner (points))`)
        .eq('userId', user.id);

      if (journeysError) {
        console.error('Error al obtener journeys:', journeysError);
        throw journeysError;
      }

      console.log('Journeys obtenidos:', journeys);

      // Calcular estadísticas
      const stats = {
        totalPoints: userData?.points || 0,
        completedMissions: 0,
        visitedCities: new Set<string>()
      };

      if (journeys && journeys.length > 0) {
        (journeys as Journey[]).forEach((journey: Journey) => {
          // Añadir la ciudad al Set de ciudades visitadas
          if (journey.cityId) {
            stats.visitedCities.add(journey.cityId);
          }

          if (journey.journeys_missions && journey.journeys_missions.length > 0) {
            journey.journeys_missions.forEach((mission: JourneyMission) => {
              if (mission.completed) {
                stats.completedMissions++;
              }
            });
          }
        });
      }

      console.log('Estadísticas calculadas:', stats);

      setLevel(userData?.level || 0);
      setXp(userData?.xp || 0);
      setXpNext(userData?.xp_next || 100);

      setStats({
        totalPoints: stats.totalPoints,
        completedMissions: stats.completedMissions,
        visitedCities: stats.visitedCities.size
      });

      console.log('Estadísticas actualizadas correctamente');

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    // Rest of the component code
  );
};

export default ProfileScreen; 