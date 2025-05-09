// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../services/supabase';
import { completeMission as dispatchCompleteMission } from '../../features/journey/journeySlice';
import { completeMission } from '../../services/pointsService';
import ImageUploadModal from '../../components/ImageUploadModal';
import { setRefreshJournal } from '../../features/journalSlice';
import { createJournalEntry } from '../../services/journalService';
import MissionCompletedModal from '../../components/MissionCompletedModal';
import CompletingMissionModal from '../../components/CompletingMissionModal';
import { addExperienceToUser } from '../../services/experienceService';
import { awardSpecificBadges } from '../../services/badgeService';
import { analyzeImage } from '../../services/aiService';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { getUserPoints } from '../../services/pointsService';

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
  cityId?: string;
  end_date: string;
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    points: number;
  };
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

const MissionCard = ({ mission, onComplete, onShare }: {
  mission: JourneyMission;
  onComplete: (imageUrl?: string) => void;
  onShare: () => void;
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const timeRemaining = getTimeRemaining(mission.end_date);
  const isExpired = timeRemaining.isExpired && !mission.completed;

  const handleMissionPress = () => {
    if (!mission.completed && !isExpired) {
      setShowUploadModal(true);
    }
  };

  const handleUploadSuccess = (imageUrl: string) => {
    setShowUploadModal(false);
    onComplete(imageUrl);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          mission.completed && styles.completedCard,
          isExpired && styles.expiredCard
        ]}
        onPress={handleMissionPress}
        disabled={mission.completed || isExpired}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
          <View style={styles.badgeContainer}>
            <Text style={[
              styles.badge,
              { backgroundColor: mission.completed ? '#005F9E' : isExpired ? '#D32F2F' : '#FFB74D' }
            ]}>
              {mission.completed ? 'Completada' : isExpired ? 'Expirada' : 'Pendiente'}
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
          {(!mission.completed && !timeRemaining.isExpired) && (
            <TouchableOpacity onPress={onShare} style={styles.shareIcon}>
              {/* @ts-ignore */}
              <Ionicons name="share-social" size={20} color="#005F9E" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <ImageUploadModal
        visible={showUploadModal}
        missionId={mission.id}
        missionTitle={mission.challenge.title}
        missionDescription={mission.challenge.description}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
};

const CityCard = ({ cityName, totalMissions, completedMissions, expiredMissions, onPress }: {
  cityName: string;
  totalMissions: number;
  completedMissions: number;
  expiredMissions?: number;
  onPress: () => void;
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
      <Ionicons name="chevron-forward" size={24} color="#666" />
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
  // @ts-ignore - React hook error
  const [cityMissions, setCityMissions] = useState<CityMissions>({});
  // @ts-ignore - React hook error
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  // @ts-ignore - React hook error
  const [loading, setLoading] = useState(true);
  // @ts-ignore - React hook error
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
  // @ts-ignore - React hook error
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  // @ts-ignore - React hook error
  const [missionToShare, setMissionToShare] = useState<JourneyMission | null>(null);
  const dispatch = useDispatch();
  const theme = useTheme();

  // Función para obtener cityId por nombre
  const getCityIdByName = async (cityName: string) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id')
        .eq('name', cityName)
        .single();
      
      if (error || !data) {
        console.error('Error al obtener cityId por nombre:', error);
        return '';
      }
      
      return data.id;
    } catch (error) {
      console.error('Error al buscar cityId:', error);
      return '';
    }
  };

  const fetchMissions = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: journeys, error: journeysError } = await supabase
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

      if (journeysError) throw journeysError;

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
        ...(journeys || []),
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
          cityName: journey.cities?.name || 'Ciudad Desconocida',
          end_date: jm.end_date,
          challenge: {
            title: jm.challenges.title,
            description: jm.challenges.description,
            difficulty: jm.challenges.difficulty,
            points: jm.challenges.points
          }
        }))
      );

      // Organizar misiones por ciudad
      const missionsByCity: CityMissions = {};
      allMissions.forEach((mission: JourneyMission) => {
        // Añadir el cityId a cada misión si está disponible en el journey
        const journeyData = allJourneys.find(j => 
          j.journeys_missions.some(jm => jm.id === mission.id)
        );
        
        if (journeyData && journeyData.cityId) {
          mission.cityId = journeyData.cityId;
        } else if (journeyData && journeyData.cities) {
          // Intentar obtener el cityId de otra manera
          (async () => {
            try {
              mission.cityId = await getCityIdByName(mission.cityName);
            } catch (e) {
              console.warn('No se pudo obtener el cityId para', mission.cityName);
            }
          })();
        }
        
        if (!missionsByCity[mission.cityName]) {
          missionsByCity[mission.cityName] = {
            completed: [],
            pending: [],
            expired: []
          };
        }
        if (mission.completed) {
          missionsByCity[mission.cityName].completed.push(mission);
        } else {
          missionsByCity[mission.cityName].pending.push(mission);
        }
      });

      // Programar recordatorios para misiones no completadas
      if (user && allMissions.length > 0) {
        for (const mission of allMissions) {
          // Solo programar recordatorios para misiones no completadas que tienen fecha de expiración
          if (!mission.completed && mission.end_date) {
            const expirationDate = new Date(mission.end_date);
            
            // Verificar que la fecha de expiración es futura
            const now = new Date();
            
            // Calcular diferencia en horas hasta la expiración
            const hoursToExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            // Solo programar recordatorios si la misión expira en menos de 24 horas (1 día)
            if (expirationDate > now && hoursToExpiration <= 24) {
              try {
                // Verificar si ya existe una notificación para esta misión en la base de datos
                const { data: existingNotifications, error: notifError } = await supabase
                  .from('notifications')
                  .select('id')
                  .eq('userid', user.id)
                  .eq('type', 'mission_expiration_soon')
                  .like('data', `%${mission.id}%`)
                  .maybeSingle();
                
                // Solo programar recordatorio si no existe una notificación previa
                if (!existingNotifications) {
                  await scheduleMissionExpirationReminder(
                    user.id,
                    mission.id,
                    mission.challenge.title,
                    expirationDate
                  );
                }
              } catch (reminderError) {
                // No mostrar error al usuario, es un proceso en segundo plano
              }
            }
          }
        }
      }

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

      Object.keys(cityMissions).forEach((cityName) => {
        const pending = cityMissions[cityName].pending;
        const mission = pending.find((m) => m.id === missionId);
        if (mission) {
          foundMission = mission;
          foundMissionTitle = mission.challenge.title;
          foundMissionPoints = mission.challenge.points;
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

      // 1. Completar la misión en la base de datos 
      console.log('🔄 Completando misión en la base de datos...');

      // Iniciar el proceso en segundo plano sin esperar su finalización
      Promise.resolve().then(async () => {
          try {
          // Completar la misión en la base de datos
            await completeMission(missionId, user?.id || '', imageUrl);
            console.log('✅ Misión completada en la base de datos');

          // 2. Si hay imagen, crear entrada de diario y proceso posterior
      if (imageUrl) {
              try {
                // Intentar obtener el cityId con fallback
                let cityId = 'unknown';
                try {
                  cityId = foundMission?.cityId || await getCityIdByName(foundCityName);
                } catch (err) {
                  console.error('❌ Error obteniendo cityId:', err);
                }
                
              // Activar indicador de generación de descripción
                setGeneratingDescription(true);
                
              // Crear entrada de diario inicialmente sin descripción
                console.log('📝 Creando entrada de diario inicial...');
                const journalEntry = await createJournalEntry({
          userId: user?.id || '',
                  cityId: cityId,
          missionId: missionId,
          title: `Misión completada: ${foundMissionTitle}`,
                content: '', // Sin descripción inicial
          photos: [imageUrl],
          tags: [foundCityName || '', 'Misión completada']
        });
              console.log('✅ Entrada inicial creada exitosamente');
                
              // Generar descripción con IA dentro de un bloque try-catch independiente con timeout
              console.log('🤖 Iniciando generación de descripción con IA en segundo plano...');
                
              // Crear un prompt específico para generar información histórica
                const customPrompt = `Analiza la imagen adjunta tomada durante mi misión "${foundMissionTitle}" en ${foundCityName}.
                
                CONTEXTO: La misión consistía en ${foundMission?.challenge?.description || foundMissionTitle}
                
                Escribe una entrada de diario como si fueses un gui turistico explicando lo que se ve en la imagen (máximo 200 palabras) que DEBE incluir:
                
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
                
                4. Una breve REFLEXIÓN PERSONAL como si yo hubiera tomado la foto durante mi visita
                
                ESTILO: Reflexivo, personal, emocionante, como un diario de viaje auténtico.
                FORMATO: Párrafos cortos y claros, en primera persona.
                
                IMPORTANTE: Concéntrate en analizar y describir LO QUE SE VE EN LA IMAGEN, no lugares genéricos de la ciudad. Sé preciso con los datos históricos pero mantén un tono personal.`;
                
              // Usar un timeout adicional de protección para el proceso de IA
              const aiTimeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                  console.warn('⚠️ Timeout de seguridad activado para proceso de IA');
                  setGeneratingDescription(false);
                  resolve();
                }, 60000); // 60 segundos de tiempo máximo
              });
              
              // Promesa para el proceso de IA
              const aiProcessPromise = (async () => {
                try {
                  console.log('📤 Enviando imagen para análisis con IA...');
                  // Verificar que la URL de la imagen es válida
                  if (!imageUrl || !imageUrl.startsWith('http')) {
                    throw new Error('URL de imagen inválida: ' + imageUrl);
                  }
                  
                  console.log('🖼️ Utilizando imagen de Cloudinary:', imageUrl.substring(0, 50) + '...');
                  const aiDescription = await analyzeImage(imageUrl, foundCityName, 'tourist', customPrompt);
                  console.log('📄 Descripción generada por IA:', aiDescription.substring(0, 50) + '...');

                  // Actualizar la entrada con la descripción generada
                  if (aiDescription && aiDescription.length > 20) {
                    console.log('🔄 Actualizando entrada con descripción de IA...');

                    try {
                    const { error } = await supabase
                      .from('journal_entries')
                      .update({ content: aiDescription })
                      .eq('missionid', missionId)
                      .eq('userid', user?.id || '');
                      
                    if (error) {
                      console.error('❌ Error al actualizar la entrada con IA:', error);
                        throw error;
                    } else {
                      console.log('✅ ENTRADA ACTUALIZADA EXITOSAMENTE con descripción IA');
                    }
                    } catch (dbError) {
                      console.error('❌ Error de base de datos:', dbError);
                      // Reintento con un enfoque alternativo
                      try {
                        console.log('🔄 Reintentando actualización con método alternativo...');
                        const { error: retryError } = await supabase.rpc('update_journal_entry', {
                          p_mission_id: missionId,
                          p_user_id: user?.id || '',
                          p_content: aiDescription
                        });
                        
                        if (!retryError) {
                          console.log('✅ Actualización exitosa con método alternativo');
                  } else {
                          throw retryError;
                        }
                      } catch (finalError) {
                        console.error('❌ Fallo en todos los intentos de actualización:', finalError);
                        throw finalError;
                      }
                    }
                  } else {
                    console.warn('⚠️ Descripción demasiado corta o vacía');
                    throw new Error('Descripción inválida');
                  }
                } catch (aiError) {
                  console.error('❌ Error en proceso de IA:', aiError);
                  console.log('🔄 Utilizando respuesta de fallback...');

                  // Actualizar con una descripción de respaldo
                  const fallbackDesc = `He completado la misión "${foundMissionTitle}" en ${foundCityName}. Durante mi visita, tuve la oportunidad de capturar esta imagen que muestra un elemento importante de la ciudad. La experiencia fue realmente enriquecedora y me permitió conectar con la historia y cultura local de manera única. ¡Conseguí ${foundMissionPoints} puntos completando esta aventura!`;
                  
                  try {
                    await supabase
                      .from('journal_entries')
                      .update({ content: fallbackDesc })
                      .eq('missionid', missionId)
                      .eq('userid', user?.id || '');
                      
                    console.log('✅ Entrada actualizada con descripción de respaldo');
                  } catch (e) {
                    console.error('❌ Error final al actualizar con descripción de respaldo:', e);
                  }
                } finally {
                  console.log('🏁 Finalizando proceso de IA');
                  setGeneratingDescription(false);
      dispatch(setRefreshJournal(true));
                }
              })();
              
              // Ejecutar ambas promesas en paralelo
              Promise.race([aiProcessPromise, aiTimeoutPromise])
                .catch(err => {
                  console.error('❌ Error en proceso paralelo de IA:', err);
                  setGeneratingDescription(false);
                });
                
              } catch (journalError) {
                console.error('❌ Error al crear entrada del diario:', journalError);
                setGeneratingDescription(false);
                dispatch(setRefreshJournal(true));
              }
            }
            
          // Otorgar insignias y añadir experiencia en un proceso independiente
          Promise.resolve().then(async () => {
            try {
              await awardSpecificBadges(user.id, 'completeMission');
              const expResult = await addExperienceToUser(user.id, foundMissionPoints);
              console.log('🏆 Experiencia añadida:', expResult);
    } catch (error) {
              console.error('⚠️ Error otorgando recompensas:', error);
              // No bloquear el flujo por errores en recompensas
            }
          }).catch(err => {
            console.warn('⚠️ Error en proceso de recompensas:', err);
            // Capturar cualquier error no controlado
          });
          
        } catch (processingError) {
          console.error('❌ Error crítico en proceso de fondo:', processingError);
            setGeneratingDescription(false);
            dispatch(setRefreshJournal(true));
          }
      }).catch(uncaughtError => {
        // Capturar cualquier error no controlado en la promesa principal
        console.error('❌ Error no controlado en proceso principal:', uncaughtError);
        setGeneratingDescription(false);
      });

      // Mostrar el modal de la misión completada
      setMissionCompleted(true);

    } catch (error) {
      console.error('❌ Error al iniciar proceso de completar misión:', error);
      Alert.alert('Error', 'No se pudo completar la misión. Inténtalo de nuevo.');
      setCompletingMission(false);
    }
  };

  // Función para manejar la navegación automática al journal
  useEffect(() => {
    if (completingMission && !missionCompleted) {
      console.log('⏱️ Navegando automáticamente al journal');
      // Navegamos al journal después de un breve tiempo
      const navigationTimeout = setTimeout(() => {
        setCompletingMission(false);
        navigation.navigate('Journal', { refresh: true });
      }, 1000); // 1 segundo de espera
      
      return () => clearTimeout(navigationTimeout);
    }
  }, [completingMission, missionCompleted, navigation]);

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

  // Añadir componente de loader para el estado de generación
  const renderGeneratingLoader = () => {
    if (generatingDescription) {
      return (
        <View style={styles.generatingLoaderOverlay}>
          <View style={styles.generatingLoaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.generatingText}>Generando descripción del diario...</Text>
            <Text style={styles.generatingSubtext}>Esto puede tardar unos momentos...</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#4CAF50" />
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus Ciudades</Text>
          <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
        </View>
        <ScrollView style={styles.citiesList}>
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
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cityData = cityMissions[selectedCity];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCity(null)}
          activeOpacity={0.7}
        >
          {/* @ts-ignore */}
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.pointsText}>Puntos: {userPoints}</Text>
      </View>

      <Text style={styles.cityTitle}>{selectedCity}</Text>

      <ScrollView style={styles.missionsList}>
        {cityData.pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Misiones Pendientes</Text>
            {cityData.pending.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={(imageUrl) => handleCompleteMission(mission.id, imageUrl)}
                onShare={() => setIsShareModalVisible(true)}
              />
            ))}
          </>
        )}

        {cityData.expired.length > 0 && (
          <>
            <View style={styles.completedDivider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.completedText, { color: '#f44336' }]}>Expiradas</Text>
              <View style={styles.dividerLine} />
            </View>
            {cityData.expired.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={() => { }}
                onShare={() => setIsShareModalVisible(true)}
              />
            ))}
          </>
        )}

        {cityData.completed.length > 0 && (
          <>
            <View style={styles.completedDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.completedText}>Completadas</Text>
              <View style={styles.dividerLine} />
            </View>
            {cityData.completed.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={() => { }}
                onShare={() => setIsShareModalVisible(true)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal de misión completada */}
      <MissionCompletedModal
        visible={missionCompleted}
        info={completedMissionInfo}
        onFinished={() => {
          console.log('Modal de misión completada cerrado');
          setMissionCompleted(false);
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center'
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#333',
    fontWeight: '500'
  },
  cityTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  citiesList: {
    flex: 1,
  },
  cityCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cityCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  missionCount: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#005F9E',
  },
  missionsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15,
  },
  completedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#005F9E',
  },
  completedText: {
    color: '#005F9E',
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completedCard: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  cardDescription: {
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficulty: {
    color: '#666',
    fontSize: 12,
  },
  points: {
    color: '#005F9E',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#005F9E',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  expiredCard: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expiredTime: {
    color: '#f44336',
  },
  generatingLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  generatingLoaderContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  generatingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  generatingSubtext: {
    color: 'white',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  shareIcon: {
    padding: 5,
  },
});

const MissionsScreen = (props: any) => {
  return <MissionsScreenComponent {...props} />;
};

export default MissionsScreen; 