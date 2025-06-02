// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList, SafeAreaView, RefreshControl, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { completeMission as dispatchCompleteMission } from '../../features/journey/journeySlice';
import { completeMission, getUserPoints } from '../../services/pointsService';
import { addExperienceToUser } from '../../services/experienceService';
import ImageUploadModal from '../../components/ImageUploadModal';
import { setRefreshJournal } from '../../features/journalSlice';
import { createJournalEntry } from '../../services/journalService';
import MissionCompletedModal from '../../components/MissionCompletedModal';
import CompletingMissionModal from '../../components/CompletingMissionModal';
import { awardSpecificBadges } from '../../services/badgeService';
import { analyzeImage, updateJournalWithAIDescription } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { getOrCreateCity } from '../../services/missionGenerator';
import MissionHintModal from '../../components/MissionHintModal';
import CreateMissionForm from '../../components/CreateMissionForm';
import { colors as defaultColors, commonStyles, typography, spacing, borderRadius, shadows } from '../../styles/theme';

type MissionsScreenRouteProp = RouteProp<{
  Missions: {
    journeyId: string;
    challenges: JourneyMission[];
  };
}, 'Missions'>;

interface MissionsScreenProps {
  route: MissionsScreenRouteProp;
  navigation: any;
}

interface CityMissions {
  [cityName: string]: {
    completed: JourneyMission[];
    pending: JourneyMission[];
    expired: JourneyMission[];
  };
}

interface JourneyMission {
  id: string;
  completed: boolean;
  cityName: string;
  end_date: string;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
    is_event: boolean;
    start_date?: string;
    end_date?: string;
  };
  order_index?: number;
  route_id?: string;
}

interface Friend {
  user2Id: string;
  username: string;
  points: number;
}

interface Journey {
  id: string;
  description: string;
  created_at: string;
  cities?: {
    name: string;
  };
  journeys_missions: {
    id: string;
    completed: boolean;
    challengeId: string;
    end_date: string;
    challenges: {
      id: string;
      title: string;
      description: string;
      difficulty: string;
      points: number;
    };
  }[];
}

const getTimeRemaining = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      isExpired: true,
      text: 'Tiempo expirado'
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      isExpired: false,
      text: `${days} días restantes`
    };
  } else if (hours > 0) {
    return {
      isExpired: false,
      text: `${hours} horas restantes`
    };
  } else {
    return {
      isExpired: false,
      text: `${minutes} minutos restantes`
    };
  }
};

const MissionCard = ({ mission, onComplete, onShare, styles, colors }: {
  mission: JourneyMission;
  onComplete: (imageUrl?: string) => void;
  onShare: () => void;
  styles: any;
  colors: any;
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  let timeRemaining = getTimeRemaining(mission.end_date);
  let isExpired = timeRemaining.isExpired && !mission.completed;
  let isNotStarted = false;
  if (mission.challenge.is_event) {
    // Usar el end_date y start_date del challenge para el contador
    timeRemaining = getTimeRemaining(mission.challenge.end_date);
    isExpired = timeRemaining.isExpired && !mission.completed;
    // Si la misión aún no ha comenzado
    if (mission.challenge.start_date) {
      const now = new Date();
      const start = new Date(mission.challenge.start_date);
      if (now < start) {
        isNotStarted = true;
        timeRemaining = { text: `Disponible desde ${start.toLocaleDateString()}` };
      }
    }
  }

  const handleMissionPress = () => {
    if (!mission.completed && !isExpired && !isNotStarted) {
      setShowUploadModal(true);
    }
  };

  const handleUploadSuccess = (imageUrl: string) => {
    setShowUploadModal(false);
    onComplete(imageUrl);
  };

  const handleShowHint = (e: any) => {
    e.stopPropagation();
    setShowHintModal(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          mission.completed && styles.completedCard,
          isExpired && styles.expiredCard,
          // Color de advertencia para misiones pendientes próximas a expirar
          !mission.completed && !isExpired && !isNotStarted && mission.challenge.difficulty === 'difícil' && { borderColor: colors.warningCard, borderWidth: 1 }
        ]}
        onPress={handleMissionPress}
        disabled={mission.completed || isExpired || isNotStarted}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
          <View style={styles.badgeContainer}>
            <Text style={[
              styles.badge,
              { backgroundColor: mission.completed ? colors.success : isExpired ? colors.error : colors.warningCard }
            ]}>
              {mission.completed ? 'Completada' : isExpired ? 'Expirada' : isNotStarted ? 'Próximamente' : 'Pendiente'}
            </Text>
            <Text style={[
              styles.timeRemaining,
              isExpired && styles.expiredTime
            ]}>
              {timeRemaining.text}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>{mission.challenge.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.difficulty}>Dificultad: {mission.challenge.difficulty}</Text>
          <Text style={styles.points}>{mission.challenge.points} puntos</Text>

          <View style={styles.actionsContainer}>
            {(!mission.completed && !isExpired && !isNotStarted) && (
              <>
                <TouchableOpacity onPress={onShare} style={styles.shareIcon}>
                  {/* @ts-ignore */}
                  <Ionicons name="share-social" size={20} color={colors.shareIcon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShowHint} style={styles.hintIcon}>
                  {/* @ts-ignore */}
                  <Ionicons name="bulb" size={20} color={colors.hintIcon} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <ImageUploadModal
        visible={showUploadModal}
        missionId={mission.id}
        missionTitle={mission.challenge.title}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      <MissionHintModal
        visible={showHintModal}
        missionId={mission.id}
        missionTitle={mission.challenge.title}
        onClose={() => setShowHintModal(false)}
      />
    </>
  );
};

const CityCard = ({ cityName, totalMissions, completedMissions, expiredMissions, onPress, styles, colors }: {
  cityName: string;
  totalMissions: number;
  completedMissions: number;
  expiredMissions?: number;
  onPress: () => void;
  styles: any;
  colors: any;
}) => (
  <TouchableOpacity style={styles.cityCard} onPress={onPress}>
    <View style={styles.cityCardContent}>
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{cityName}</Text>
        <Text style={styles.missionCount}>
          {completedMissions}/{totalMissions} misiones completadas
        </Text>
      </View>
      {/* @ts-ignore */}
      <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
    </View>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${(completedMissions / totalMissions) * 100}%` }
        ]}
      />
    </View>
  </TouchableOpacity>
);

const FriendSelectionModal = ({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (friend: Friend) => void;
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (visible) {
      const fetchFriends = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const { data: friendData, error } = await supabase
            .from('friends')
            .select('user2Id')
            .eq('user1Id', user.id);
          if (error) throw error;

          const friendDetails = await Promise.all(
            friendData.map(async (friend: { user2Id: string }) => {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, points')
                .eq('id', friend.user2Id)
                .single();
              if (userError) return null;
              return {
                user2Id: friend.user2Id,
                username: userData.username,
                points: userData.points,
              };
            })
          );

          setFriends(friendDetails.filter((f) => f !== null) as Friend[]);
        } catch (error) {
          console.error('Error fetching friends:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
    }
  }, [visible, user]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <Text style={modalStyles.modalTitle}>Selecciona un amigo</Text>
          {loading ? (
            <ActivityIndicator size={40} color="#4CAF50" />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.user2Id}
              renderItem={({ item }) => (
                <TouchableOpacity style={modalStyles.friendItem} onPress={() => onSelect(item)}>
                  <Text style={modalStyles.friendName}>{item.username}</Text>
                  <Text style={modalStyles.friendPoints}>Puntos: {item.points}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  friendItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  friendName: {
    fontSize: 16
  },
  friendPoints: {
    fontSize: 14,
    color: '#666'
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});

const MissionsScreenComponent = ({ route, navigation }: MissionsScreenProps) => {
  const { journeyId } = route.params || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const [cityMissions, setCityMissions] = useState<CityMissions>({});
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [completedMissionInfo, setCompletedMissionInfo] = useState<{
    title: string;
    points: number;
    cityName: string;
    levelUp?: boolean;
    newLevel?: number;
    xpGained: number;
    remainingXP: number;
    xpNext: number;
    journalEntry?: {
      content: string;
      imageUrl: string;
    };
  } | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [missionToShare, setMissionToShare] = useState<JourneyMission | null>(null);
  const dispatch = useDispatch();
  const { colors, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showRoutesModal, setShowRoutesModal] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [hasRouteForSelectedCity, setHasRouteForSelectedCity] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const isAdmin = user?.role === 'admin';
  const [citiesMap, setCitiesMap] = useState({});
  const styles = getStyles(colors, isDarkMode);

  // Cargar puntos del usuario al inicio
  useEffect(() => {
    if (user?.id) {
      getUserPoints(user.id).then(points => {
        setUserPoints(points);
      }).catch(console.error);
    }
  }, [user?.id]);

  // Cargar el mapeo de cityId a nombre de ciudad
  const fetchCitiesMap = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name');
    if (!error && data) {
      const map = {};
      data.forEach(city => { map[city.id] = city.name; });
      setCitiesMap(map);
    }
  };

  useEffect(() => {
    fetchCitiesMap();
  }, []);

  const fetchMissions = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      // Obtener viajes propios
      const { data: ownJourneys, error: ownJourneysError } = await supabase
        .from('journeys')
        .select(`
          id,
          description,
          created_at,
          cities (
            name
          ),
          journeys_missions!inner (
            id,
            completed,
            challengeId,
            end_date,
            order_index,
            route_id,
            challenges!inner (
              id,
              title,
              description,
              difficulty,
              points
            )
          )
        `)
        .eq('userId', user.id)
        .order('created_at', { ascending: false });

      if (ownJourneysError) throw ownJourneysError;

      // Obtener viajes compartidos
      const { data: sharedJourneys, error: sharedJourneysError } = await supabase
        .from('journeys_shared')
        .select(`
          journeyId,
          journeys!inner (
            id,
            description,
            created_at,
            cities (
              name
            ),
            journeys_missions!inner (
              id,
              completed,
              challengeId,
              end_date,
              challenges!inner (
                id,
                title,
                description,
                difficulty,
                points
              )
            )
          )
        `)
        .eq('sharedWithUserId', user.id)
        .eq('status', 'accepted')
        .order('shared_at', { ascending: false });

      if (sharedJourneysError) throw sharedJourneysError;

      // Combinar viajes propios y compartidos
      const allJourneys = [
        ...(ownJourneys || []),
        ...(sharedJourneys?.map(shared => shared.journeys) || [])
      ];

      if (allJourneys.length === 0) {
        setError('No hay viajes disponibles');
        setLoading(false);
        return;
      }

      const allMissions = allJourneys.flatMap((journey: Journey) =>
        journey.journeys_missions.map((jm) => ({
          id: jm.id,
          completed: jm.completed,
          cityName: jm.challenges.cityId && citiesMap[jm.challenges.cityId]
            ? citiesMap[jm.challenges.cityId]
            : journey.cities?.name || 'Ciudad Desconocida',
          end_date: jm.challenges.is_event && jm.challenges.end_date
            ? jm.challenges.end_date
            : jm.end_date,
          challenge: {
            title: jm.challenges.title,
            description: jm.challenges.description,
            difficulty: jm.challenges.difficulty,
            points: jm.challenges.points,
            is_event: jm.challenges.is_event ?? false,
            start_date: jm.challenges.start_date ?? null,
            end_date: jm.challenges.end_date ?? null,
          },
          order_index: jm.order_index,
          route_id: jm.route_id
        }))
      );

      // Organizar misiones por ciudad
      const missionsByCity: CityMissions = {};
      allMissions.forEach((mission: JourneyMission) => {
        if (!missionsByCity[mission.cityName]) {
          missionsByCity[mission.cityName] = {
            completed: [],
            pending: [],
            expired: []
          };
        }
        // Lógica de expiración unificada para normales y evento
        let isExpired = false;
        let endDate = mission.challenge.is_event && mission.challenge.end_date
          ? mission.challenge.end_date
          : mission.end_date;
        if (!mission.completed && endDate) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(0, 0, 0, 0);
          if (end < now) {
            isExpired = true;
          }
        }
        if (mission.completed) {
          missionsByCity[mission.cityName].completed.push(mission);
        } else if (isExpired) {
          missionsByCity[mission.cityName].expired.push(mission);
        } else {
          missionsByCity[mission.cityName].pending.push(mission);
        }
      });

      setCityMissions(missionsByCity);
    } catch (error) {
      console.error('Error fetching missions:', error);
      setError('Error al cargar las misiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [journeyId]);

  // Efecto para verificar si la ciudad seleccionada tiene una ruta
  useEffect(() => {
    if (selectedCity && cityMissions[selectedCity]) {
      const missions = cityMissions[selectedCity].pending
        .concat(cityMissions[selectedCity].completed)
        .concat(cityMissions[selectedCity].expired);
      const hasRoute = missions.some(mission => mission.route_id !== null);
      setHasRouteForSelectedCity(hasRoute);
    } else {
      setHasRouteForSelectedCity(false);
    }
  }, [selectedCity, cityMissions]);

  const handleCompleteMission = async (missionId: string, imageUrl?: string) => {
    console.log('🎯 Iniciando completeMission para misión:', missionId);

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para completar misiones.');
      return;
    }

    if (completingMission) {
      console.log('⚠️ Ya hay una misión en proceso de completarse, ignorando solicitud');
      return;
    }

    try {
      setCompletingMission(true);

      // Buscar la misión en los datos locales
      let foundMissionTitle = '';
      let foundMissionPoints = 0;
      let foundCityName = '';
      let foundMission = null;
      let foundMissionIndex = -1;

      Object.keys(cityMissions).forEach((cityName) => {
        const pending = cityMissions[cityName].pending;
        const missionIndex = pending.findIndex((m) => m.id === missionId);
        if (missionIndex !== -1) {
          foundMission = pending[missionIndex];
          foundMissionIndex = missionIndex;
          foundMissionTitle = foundMission.challenge.title;
          foundMissionPoints = foundMission.challenge.points;
          foundCityName = cityName;
        }
      });

      // Preparar información para mostrar en el modal
      setCompletedMissionInfo({
        title: foundMissionTitle,
        points: foundMissionPoints,
        cityName: foundCityName,
        xpGained: foundMissionPoints,
        remainingXP: 0,
        xpNext: 50,
        journalEntry: imageUrl ? {
          content: `He completado la misión "${foundMissionTitle}" en ${foundCityName}. ¡Conseguí ${foundMissionPoints} puntos!`,
          imageUrl
        } : undefined
      });

      // Actualizar estado en Redux para reflejar cambios inmediatamente en la UI
      dispatch(dispatchCompleteMission(missionId));
      dispatch(setRefreshJournal(true));

      // Iniciar el proceso en segundo plano
      Promise.resolve().then(async () => {
        try {
          // Completar la misión en la base de datos
          await completeMission(missionId, user?.id || '', imageUrl);
          console.log('✅ Misión completada en la base de datos');

          // Si hay imagen, crear entrada de diario y proceso posterior
          if (imageUrl) {
            try {
              // Intentar obtener el cityId
              let cityId;
              try {
                cityId = foundMission?.cityId || await getOrCreateCity(foundCityName, user?.id);
                console.log('🌍 CityId obtenido:', cityId);
              } catch (cityError) {
                console.error('❌ Error al obtener/crear cityId:', cityError);
                cityId = 'unknown';
              }

              // Activar indicador de generación de descripción
              setGeneratingDescription(true);

              // Crear entrada de diario inicial
              console.log('📝 Creando entrada de diario inicial...');
              const journalEntry = await createJournalEntry({
                userId: user?.id || '',
                cityId: cityId,
                missionId: missionId,
                title: `Misión completada: ${foundMissionTitle}`,
                content: `He completado la misión "${foundMissionTitle}" en ${foundCityName}. ¡Conseguí ${foundMissionPoints} puntos!`,
                photos: [imageUrl],
                tags: [foundCityName || '', 'Misión completada']
              });

              console.log('📔 Entrada de diario creada:', journalEntry);

              // Generar descripción con IA
              console.log('🤖 Iniciando generación de descripción con IA...');

              const customPrompt = `Analiza la imagen adjunta tomada durante la misión "${foundMissionTitle}" en ${foundCityName}.
              
              CONTEXTO: La misión consistía en ${foundMission?.challenge?.description || foundMissionTitle}
              
              Escribe una descripción informativa como un guía turístico profesional explicando lo que se ve en la imagen (máximo 200 palabras). La descripción DEBE incluir:
              
              1. IDENTIFICACIÓN DEL CONTENIDO DE LA IMAGEN:
                 - Si es un monumento: su nombre exacto y estilo arquitectónico
                 - Si es una planta o animal: su especie y características
                 - Si es una obra de arte: su nombre y autor
                 - Si es un lugar: su nombre completo y función
              
              2. INFORMACIÓN HISTÓRICA SOBRE LO MOSTRADO EN LA IMAGEN:
                 - Año de construcción/creación/fundación del elemento principal
                 - Origen histórico o etimológico del nombre
                 - Un hecho importante en su historia
              
              3. DOS CURIOSIDADES INTERESANTES sobre el elemento principal que aparece en la imagen
              
              4. CONTEXTO TURÍSTICO: Breve mención de por qué este lugar/elemento es importante para los visitantes
              
              IMPORTANTE:
              - Escribe en TERCERA PERSONA, como un guía turístico explicando a visitantes
              - NO uses primera persona ("yo", "mi", "nosotros", etc.)
              - Usa un tono profesional, informativo y educativo
              - Organiza la información en párrafos cortos y claros`;

              let aiSuccess = false;
              try {
                const aiDescription = await analyzeImage(imageUrl, foundCityName, 'tourist', customPrompt);
                console.log('🤖 Descripción generada por IA:', aiDescription?.substring(0, 50) + '...');

                if (aiDescription && aiDescription.length > 20) {
                  // Usar la nueva función especializada para actualizar la descripción
                  const updateResult = await updateJournalWithAIDescription(
                    missionId,
                    user?.id || '',
                    aiDescription
                  );

                  if (updateResult.success) {
                    console.log('✅ Descripción actualizada exitosamente');
                    aiSuccess = true;
                  } else {
                    console.warn('⚠️ No se pudo actualizar la descripción:', updateResult.message);

                    // Intento de respaldo usando el método directo anterior
                    console.log('🔄 Intentando actualización directa como respaldo...');
                    const { error: updateError } = await supabase
                      .from('journal_entries')
                      .update({ content: aiDescription })
                      .eq('missionid', missionId)
                      .eq('userid', user?.id || '');

                    if (updateError) {
                      console.error('❌ Error en actualización de respaldo:', updateError);
                    } else {
                      console.log('✅ Actualización de respaldo exitosa');
                      aiSuccess = true;
                    }
                  }
                } else {
                  console.warn('⚠️ Descripción generada demasiado corta o vacía');
                }
              } catch (aiError) {
                console.error('❌ Error en proceso de IA:', aiError);
                // No lanzar error, continuar con el flujo
              } finally {
                setGeneratingDescription(false);
                dispatch(setRefreshJournal(true));

                // Actualizar el estado local de las misiones independientemente del éxito o fracaso de la IA
                updateLocalMissionState(missionId, foundCityName, foundMissionIndex);
              }
            } catch (journalError) {
              console.error('❌ Error al crear entrada del diario:', journalError);
              // No lanzar error, continuar con el flujo

              // Actualizar el estado local de las misiones incluso si hay error en el diario
              updateLocalMissionState(missionId, foundCityName, foundMissionIndex);
            }
          } else {
            // Si no hay imagen, actualizar el estado local directamente
            updateLocalMissionState(missionId, foundCityName, foundMissionIndex);
          }

          // Otorgar insignias y experiencia
          try {
            await awardSpecificBadges(user.id, 'completeMission');
          } catch (badgeError) {
            console.error('❌ Error al otorgar insignias:', badgeError);
            // No interrumpir el flujo por error en las insignias
          }

          try {
            const expResult = await addExperienceToUser(user.id, foundMissionPoints);

            // Actualizar información de misión completada con datos de experiencia
            setCompletedMissionInfo(prev => ({
              ...prev!,
              levelUp: expResult.leveledUp,
              newLevel: expResult.level,
              remainingXP: expResult.xp,
              xpNext: expResult.xpNext
            }));
          } catch (expError) {
            console.error('❌ Error al añadir experiencia:', expError);
            // No interrumpir el flujo por error en la experiencia
          }

          // Actualizar los puntos del usuario tras completar la misión
          try {
            const updatedPoints = await getUserPoints(user.id);
            setUserPoints(updatedPoints);
          } catch (pointsError) {
            console.error('❌ Error al actualizar puntos:', pointsError);
          }

        } catch (error) {
          console.error('Error en proceso de fondo:', error);
          Alert.alert('Error', 'Hubo un problema al procesar la misión. Por favor, inténtalo de nuevo.');
        } finally {
          setCompletingMission(false);
        }
      });

      // Mostrar el modal de misión completada
      setMissionCompleted(true);

    } catch (error) {
      console.error('Error al completar misión:', error);
      Alert.alert('Error', 'No se pudo completar la misión. Inténtalo de nuevo.');
      setCompletingMission(false);
    }
  };

  // Función para actualizar el estado local de las misiones
  const updateLocalMissionState = (missionId: string, cityName: string, missionIndex: number) => {
    if (missionIndex === -1 || !cityName) return;

    setCityMissions(prevState => {
      // Crear copia profunda del estado anterior
      const newState = JSON.parse(JSON.stringify(prevState));

      if (newState[cityName] &&
        newState[cityName].pending &&
        missionIndex < newState[cityName].pending.length) {

        // Obtener la misión de las pendientes
        const mission = newState[cityName].pending[missionIndex];

        // Marcarla como completada
        mission.completed = true;

        // Eliminar de pendientes
        newState[cityName].pending.splice(missionIndex, 1);

        // Añadir a completadas
        newState[cityName].completed.push(mission);

        console.log('🔄 Estado local de misión actualizado: Misión movida de pendiente a completada');
      }

      return newState;
    });
  };

  useEffect(() => {
    if (missionCompleted) {
      // Si la misión se completó, programar la navegación al diario
      const timer = setTimeout(() => {
        setMissionCompleted(false);
        navigation.navigate('Journal', { refresh: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [missionCompleted, navigation]);

  const handleShareJourney = async (friend: Friend) => {
    if (!journeyId) {
      Alert.alert('Error', 'No se pudo compartir el journey porque no se encontró el ID del viaje.');
      return;
    }

    try {
      const { error } = await supabase
        .from('journeys_shared')
        .insert({
          journeyId: journeyId,
          ownerId: user?.id || '',
          sharedWithUserId: friend.user2Id
        });
      if (error) throw error;
      Alert.alert('Éxito', `Journey compartido con ${friend.username}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo compartir el journey');
    } finally {
      setIsShareModalVisible(false);
    }
  };

  // Renderizar el loader de generación de descripción
  const renderGeneratingLoader = () => {
    if (generatingDescription) {
      return (
        <View style={styles.generatingLoaderOverlay}>
          <View style={styles.generatingLoaderContainer}>
            <ActivityIndicator size="large" color={colors.surface} />
            <Text style={styles.generatingText}>Generando descripción del diario...</Text>
            <Text style={styles.generatingSubtext}>Esto puede tardar unos momentos...</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  // Función para recargar las misiones
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    setRefreshing(false);
  };

  // Modificar la función que ordena las misiones
  const sortMissions = (missions: JourneyMission[]) => {
    return missions.sort((a, b) => {
      // Si ambas tienen order_index, usar ese para ordenar
      if (a.order_index !== null && b.order_index !== null && a.order_index !== undefined && b.order_index !== undefined) {
        return a.order_index - b.order_index;
      }
      // Si ambas tienen end_date, ordenar por la más próxima a expirar
      if (a.end_date && b.end_date) {
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      }
      // Si solo una tiene end_date, esa va antes
      if (a.end_date && !b.end_date) return -1;
      if (!a.end_date && b.end_date) return 1;
      // Si ninguna tiene, mantener el orden original
      return 0;
    });
  };

  const handleViewRoute = async (cityName: string) => {
    try {
      // Buscar una misión con route_id en la ciudad seleccionada
      const missionsInCity = cityMissions[cityName]?.pending
        .concat(cityMissions[cityName]?.completed)
        .concat(cityMissions[cityName]?.expired) || [];

      const missionWithRoute = missionsInCity.find(m => m.route_id !== null);

      if (!missionWithRoute || !missionWithRoute.route_id) {
        Alert.alert('Error', 'No se encontró información de ruta para esta ciudad.');
        return;
      }

      const routeId = missionWithRoute.route_id;
      console.log('ℹ️ Intentando obtener ruta con ID:', routeId);

      // Consultar la tabla routes usando el routeId encontrado
      const { data: route, error } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          description,
          journeys_missions (
            id,
            order_index,
            challenge:challenges (
              title,
              description,
              difficulty,
              points
            )
          )
        `)
        .eq('id', routeId) // Usar el ID de la ruta encontrado
        .single();

      if (error) throw error;

      if (route) {
        setCurrentRoute(route);
        setShowRoutesModal(true);
      }
    } catch (error) {
      console.error('Error al obtener la ruta:', error);
      Alert.alert('Error', 'No se pudo cargar la ruta');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color={colors.success} />
        <Text style={styles.loadingText}>Cargando misiones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMissions}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedCity) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="refresh" style={styles.refreshIcon} />
              )}
            </TouchableOpacity>
            <Text style={styles.title}>Tus Ciudades</Text>
          </View>
          <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
        </View>
        <View style={styles.container}>
          <ScrollView
            style={styles.citiesList}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {Object.entries(cityMissions).map(([cityName, missions]) => (
              <CityCard
                key={cityName}
                cityName={cityName}
                totalMissions={
                  // @ts-ignore - TypeScript no puede inferir la estructura
                  missions.completed.length + missions.pending.length
                }
                completedMissions={
                  // @ts-ignore - TypeScript no puede inferir la estructura
                  missions.completed.length
                }
                expiredMissions={
                  // @ts-ignore - TypeScript no puede inferir la estructura
                  missions.expired.length
                }
                onPress={() => setSelectedCity(cityName)}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const cityData = cityMissions[selectedCity];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCity(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.shareIcon} />
            ) : (
              <Ionicons name="refresh" size={24} color={colors.shareIcon} />
            )}
          </TouchableOpacity>
          <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
        </View>
      </View>
      <View style={styles.container}>
        {showCreateForm && isAdmin ? (
          <View style={styles.createFormContainer}>
            <CreateMissionForm onMissionCreated={() => {
              setShowCreateForm(false);
              fetchMissions();
            }} />
          </View>
        ) : (
          <>
            <Text style={styles.cityTitle}>{selectedCity}</Text>
            <ScrollView
              style={styles.missionsList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {cityData.pending.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Misiones Pendientes</Text>
                  {sortMissions(cityData.pending).map(mission =>
                    mission.challenge && mission.challenge.is_event ? (
                      <View key={mission.id} style={{ backgroundColor: colors.eventBackground, borderColor: colors.eventBorder, borderWidth: 2, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: colors.eventText, fontSize: 18 }}>{mission.challenge.title}</Text>
                        <Text>{mission.challenge.description}</Text>
                        <Text style={{ color: colors.eventText, marginTop: 8 }}>Misión de Evento</Text>
                      </View>
                    ) : (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onComplete={(imageUrl) => handleCompleteMission(mission.id, imageUrl)}
                        onShare={() => setIsShareModalVisible(true)}
                        styles={styles}
                        colors={colors}
                      />
                    )
                  )}
                  {cityData.expired.length > 0 && (
                    <View style={{ height: 2, backgroundColor: colors.dividerAlt, marginVertical: 16, borderRadius: 2 }} />
                  )}
                </>
              )}

              {cityData.expired.length > 0 && (
                <>
                  <View style={styles.completedDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={[styles.completedText, { color: colors.error }]}>Expiradas</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {sortMissions(cityData.expired).map(mission =>
                    mission.challenge && mission.challenge.is_event ? (
                      <View key={mission.id} style={{ backgroundColor: colors.eventBackground, borderColor: colors.eventBorder, borderWidth: 2, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: colors.eventText, fontSize: 18 }}>{mission.challenge.title}</Text>
                        <Text>{mission.challenge.description}</Text>
                        <Text style={{ color: colors.eventText, marginTop: 8 }}>Misión de Evento</Text>
                      </View>
                    ) : (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onComplete={() => { }}
                        onShare={() => setIsShareModalVisible(true)}
                        styles={styles}
                        colors={colors}
                      />
                    )
                  )}
                </>
              )}

              {cityData.completed.length > 0 && (
                <>
                  <View style={styles.completedDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.completedText}>Completadas</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  {sortMissions(cityData.completed).map(mission =>
                    mission.challenge && mission.challenge.is_event ? (
                      <View key={mission.id} style={{ backgroundColor: colors.eventBackground, borderColor: colors.eventBorder, borderWidth: 2, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: colors.eventText, fontSize: 18 }}>{mission.challenge.title}</Text>
                        <Text>{mission.challenge.description}</Text>
                        <Text style={{ color: colors.eventText, marginTop: 8 }}>Misión de Evento</Text>
                      </View>
                    ) : (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onComplete={() => { }}
                        onShare={() => setIsShareModalVisible(true)}
                        styles={styles}
                        colors={colors}
                      />
                    )
                  )}
                </>
              )}
            </ScrollView>

            {/* Modal de misión completada */}
            <MissionCompletedModal
              visible={missionCompleted}
              info={completedMissionInfo}
              onFinished={() => {
                setMissionCompleted(false);
                navigation.navigate('Journal', { refresh: true });
              }}
            />

            {/* Modal de carga durante el proceso */}
            <CompletingMissionModal
              visible={completingMission && !missionCompleted}
            />

            <FriendSelectionModal
              visible={isShareModalVisible}
              onClose={() => setIsShareModalVisible(false)}
              onSelect={handleShareJourney}
            />

            {renderGeneratingLoader()}
          </>
        )}

        {/* Modal de Rutas */}
        <Modal
          visible={showRoutesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRoutesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ruta de Misiones</Text>
                <TouchableOpacity onPress={() => setShowRoutesModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {currentRoute && (
                <ScrollView style={styles.routeList}>
                  {currentRoute.journeys_missions
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((mission: any, index: number) => (
                      <View key={mission.id} style={styles.routeItem}>
                        <View style={styles.routeNumber}>
                          <Text style={styles.routeNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.routeMissionInfo}>
                          <Text style={styles.routeMissionTitle}>
                            {mission.challenge.title}
                          </Text>
                          <Text style={styles.routeMissionDescription}>
                            {mission.challenge.description}
                          </Text>
                          <View style={styles.routeMissionMeta}>
                            <Text style={styles.routeMissionDifficulty}>
                              Dificultad: {mission.challenge.difficulty}
                            </Text>
                            <Text style={styles.routeMissionPoints}>
                              {mission.challenge.points} puntos
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// Crear función para estilos dinámicos
const getStyles = (colors, isDarkMode) => ({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : colors.surface,
    paddingHorizontal: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: isDarkMode ? 'transparent' : colors.primary,
    paddingVertical: isDarkMode ? spacing.md : spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isDarkMode ? 10 : 18,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: 24,
    backgroundColor: isDarkMode ? colors.surface : '#FFF',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  refreshIcon: {
    color: isDarkMode ? colors.primary : colors.primary,
    fontSize: 28,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    minWidth: 100,
    justifyContent: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 20,
    marginLeft: 5,
    color: colors.surface,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isDarkMode ? 8 : 10,
    minWidth: 0,
    flexShrink: 1,
  },
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: spacing.lg,
    letterSpacing: 1,
  },
  loadingContainer: commonStyles.loadingContainer,
  loadingText: commonStyles.loadingText,
  errorContainer: commonStyles.errorContainer,
  errorText: commonStyles.errorText,
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDarkMode ? colors.text.primary : colors.surface,
    letterSpacing: 1,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: isDarkMode ? colors.text.primary : colors.surface,
    maxWidth: 110,
    overflow: 'hidden',
    textAlign: 'right',
  },
  citiesList: {
    flex: 1,
  },
  cityCard: {
    backgroundColor: isDarkMode ? colors.surface : colors.primary,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.large,
    borderLeftWidth: isDarkMode ? 6 : 0,
    borderLeftColor: isDarkMode ? colors.accent : 'transparent',
  },
  cityCardContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: isDarkMode ? colors.text.primary : colors.surface,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  missionCount: {
    fontSize: 15,
    color: isDarkMode ? colors.primary : colors.surface,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: isDarkMode ? 12 : 18,
    backgroundColor: isDarkMode ? '#222F43' : '#E3EAFE',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: isDarkMode ? colors.accent : colors.secondary,
    borderRadius: 10,
  },
  missionsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  completedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  completedText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontSize: 16,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: isDarkMode ? colors.surface : colors.primary,
    borderRadius: 18,
    paddingVertical: isDarkMode ? spacing.md : spacing.lg,
    paddingHorizontal: isDarkMode ? spacing.md : spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'column',
    ...shadows.medium,
    borderLeftWidth: isDarkMode ? 4 : 0,
    borderLeftColor: isDarkMode ? colors.accent : 'transparent',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  completedCard: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? colors.text.primary : colors.surface,
    letterSpacing: 0.5,
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: 'wrap',
    width: '100%',
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: colors.secondary,
    overflow: 'hidden',
    maxWidth: 80,
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  cardDescription: {
    color: isDarkMode ? colors.text.secondary : colors.surface,
    marginBottom: spacing.sm,
    fontSize: 13,
    flexWrap: 'wrap',
    minWidth: 0,
    width: '100%',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: 2,
  },
  difficulty: {
    color: colors.primary,
    fontSize: 11,
  },
  points: {
    color: isDarkMode ? colors.secondary : colors.surface,
    fontWeight: 'bold',
    marginTop: 4,
    width: '100%',
    textAlign: 'right',
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.surface,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  expiredCard: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  timeRemaining: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  expiredTime: {
    color: colors.error,
  },
  generatingLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  generatingLoaderContainer: {
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    width: '80%',
    alignItems: 'center',
    ...shadows.medium,
  },
  generatingText: {
    color: colors.surface,
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  generatingSubtext: {
    color: colors.surface,
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  shareIcon: {
    padding: 5,
  },
  modalOverlay: commonStyles.modalOverlay,
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    width: '80%',
    maxHeight: '80%',
    ...shadows.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.primary,
  },
  friendItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  friendName: {
    fontSize: 16,
    color: colors.primary,
  },
  friendPoints: {
    fontSize: 14,
    color: colors.secondary,
  },
  cancelButton: {
    marginTop: spacing.md,
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.surface,
    fontWeight: 'bold',
  },
  levelUpContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    width: '100%',
    alignItems: 'center',
  },
  levelUpText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hintIcon: {
    padding: 5,
    backgroundColor: isDarkMode ? colors.accent + '22' : colors.eventBackground,
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.surface : '#E4EAFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginRight: spacing.md,
  },
  routeButtonText: {
    color: colors.primary,
    marginLeft: 5,
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  routeList: {
    maxHeight: '80%',
  },
  routeItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  routeNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  routeNumberText: {
    color: colors.surface,
    fontWeight: 'bold',
  },
  routeMissionInfo: {
    flex: 1,
  },
  routeMissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  routeMissionDescription: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  routeMissionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeMissionDifficulty: {
    fontSize: 12,
    color: colors.secondary,
  },
  routeMissionPoints: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  createFormContainer: {
    padding: spacing.md,
  },
  chevronIcon: {
    marginLeft: spacing.md,
    fontSize: 30,
    color: isDarkMode ? colors.text.secondary : colors.surface,
    opacity: 0.8,
  },
});

const MissionsScreen = (props: any) => {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  
  return (
    <SafeAreaViewContext style={styles.container}>
      <MissionsScreenComponent {...props} />
    </SafeAreaViewContext>
  );
};

export default MissionsScreen; 