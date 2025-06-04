import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import ImageUploadModal from '../../components/ImageUploadModal';
import MissionCompletedModal from '../../components/MissionCompletedModal';
import CompletingMissionModal from '../../components/CompletingMissionModal';
import { completeMission } from '../../services/pointsService';
import { addExperienceToUser } from '../../services/experienceService';
import { awardSpecificBadges } from '../../services/badgeService';
import { createJournalEntry } from '../../services/journalService';
import { analyzeImage, updateJournalWithAIDescription } from '../../services/aiService';
import { getOrCreateCity } from '../../services/missionGenerator';

interface Mission {
  id: string;
  completed: boolean;
  cityName: string;
  end_date?: string;
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
  start_date?: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
  journey_id: string;
  journeys_missions: Mission[];
}

type RouteDetailRouteProp = {
  params: {
    route: Route;
  };
};

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

const RouteDetailScreen = () => {
  const route = useRoute<RouteDetailRouteProp>();
  const navigation = useNavigation();
  const { route: routeData } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [completedMissionInfo, setCompletedMissionInfo] = useState<{
    title: string;
    points: number;
    cityName: string;
    levelUp?: boolean;
    newLevel?: number;
    xpGained: number;
    remainingXP: number;
    xpNext: number;
  } | null>(null);

  const handleMissionPress = (mission: Mission) => {
    let missionIsExpired = false;
    let missionIsNotStarted = false;
    let endDateForCheck = mission.end_date;

    if (mission.challenge.is_event) {
      endDateForCheck = mission.challenge.end_date;
      if (mission.challenge.start_date) {
        const now = new Date();
        const start = new Date(mission.challenge.start_date);
        if (now < start) {
          missionIsNotStarted = true;
        }
      }
    }

    if (!mission.completed && endDateForCheck) {
      const now = new Date();
      const end = new Date(endDateForCheck);
      if (now > end) {
        missionIsExpired = true;
      }
    }

    if (!mission.completed && !missionIsExpired && !missionIsNotStarted) {
      setSelectedMission(mission);
      setShowUploadModal(true);
    } else {
      let message = '';
      if (mission.completed) message = 'Esta misión ya está completada.';
      else if (missionIsExpired) message = 'Esta misión ha expirado.';
      else if (missionIsNotStarted) message = 'Esta misión aún no ha comenzado.';
      if (message) console.log('Misión no interactuable:', message);
    }
  };

  const handleUploadSuccess = async (imageUrl: string) => {
    if (!selectedMission || !user) return;

    setShowUploadModal(false);
    setCompletingMission(true);

    try {
      await completeMission(selectedMission.id, user.id, imageUrl);

      const cityId = await getOrCreateCity(selectedMission.cityName, user.id);
      await createJournalEntry({
        userId: user.id,
        cityId: cityId,
        missionId: selectedMission.id,
        title: `Misión completada: ${selectedMission.challenge.title}`,
        content: `He completado la misión "${selectedMission.challenge.title}" en ${selectedMission.cityName}. ¡Conseguí ${selectedMission.challenge.points} puntos!`,
        photos: [imageUrl],
        tags: [selectedMission.cityName, 'Misión completada']
      });

      const customPrompt = `Analiza la imagen adjunta tomada durante la misión "${selectedMission.challenge.title}" en ${selectedMission.cityName}.
      
      CONTEXTO: La misión consistía en ${selectedMission.challenge.description}
      
      Escribe una descripción informativa como un guía turístico profesional explicando lo que se ve en la imagen (máximo 200 palabras).`;

      const aiDescription = await analyzeImage(imageUrl, selectedMission.cityName, 'tourist', customPrompt);
      if (aiDescription) {
        await updateJournalWithAIDescription(selectedMission.id, user.id, aiDescription);
      }

      await awardSpecificBadges(user.id, 'completeMission');
      const expResult = await addExperienceToUser(user.id, selectedMission.challenge.points);

      setCompletedMissionInfo({
        title: selectedMission.challenge.title,
        points: selectedMission.challenge.points,
        cityName: selectedMission.cityName,
        levelUp: expResult.leveledUp,
        newLevel: expResult.level,
        xpGained: selectedMission.challenge.points,
        remainingXP: expResult.xp,
        xpNext: expResult.xpNext
      });

      setMissionCompleted(true);

    } catch (error) {
      console.error('Error al completar misión:', error);
    } finally {
      setCompletingMission(false);
    }
  };

  const renderMissionItem = ({ item }: { item: Mission }) => {
    const now = new Date();
    let timeRemaining = { isExpired: false, text: 'Sin fecha límite' };
    let isExpired = false;
    let isNotStarted = false;
    let dateStatusText = 'Sin fecha límite';

    const endDateToUse = item.challenge.is_event && item.challenge.end_date
      ? item.challenge.end_date
      : item.end_date;

    const startDateToUse = item.challenge.is_event && item.challenge.start_date
      ? item.challenge.start_date
      : item.start_date;

    if (!item.completed && startDateToUse) {
      const start = new Date(startDateToUse);
      if (now < start) {
        isNotStarted = true;
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        dateStatusText = `Disponible desde ${start.toLocaleDateString(undefined, options)}`;
      }
    }

    if (!item.completed && !isNotStarted && endDateToUse) {
      const end = new Date(endDateToUse);
      if (now > end) {
        isExpired = true;
        dateStatusText = 'Tiempo expirado';
      } else {
        timeRemaining = getTimeRemaining(endDateToUse);
        dateStatusText = timeRemaining.text;
      }
    } else if (!item.completed && !isNotStarted && !endDateToUse) {
      dateStatusText = 'Sin fecha límite';
    }

    let cardStyles: any[] = [styles.card];
    let badgeText = 'Pendiente';
    let badgeColor = '#FFB74D';

    if (item.completed) {
      badgeText = 'Completada';
      badgeColor = '#38b000';
      cardStyles.push(styles.completedCard);
      dateStatusText = 'Misión completada';
    } else if (isNotStarted) {
      badgeText = 'Próximamente';
      badgeColor = '#0071c2';
    } else if (isExpired) {
      badgeText = 'Expirada';
      badgeColor = '#D32F2F';
      cardStyles.push(styles.expiredCard);
    }

    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={() => handleMissionPress(item)}
        disabled={item.completed || isExpired || isNotStarted}
      >
        <View style={styles.cardHeader}>
          <View style={styles.missionOrderContainer}>
            <Text style={styles.missionOrderText}>{(item.order_index !== undefined && item.order_index !== null) ? item.order_index : '-'}</Text>
          </View>
          <View style={styles.missionTitleContainer}>
            <Text style={styles.cardTitle}>{item.challenge.title}</Text>
          </View>

          <View style={styles.badgeContainer}>
            <Text style={[
              styles.badge,
              { backgroundColor: badgeColor }
            ]}>
              {badgeText}
            </Text>
            {dateStatusText !== '' && (
              <Text style={[
                styles.timeRemaining,
                isExpired && styles.expiredTime
              ]}>
                {dateStatusText}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.cardDescription}>{item.challenge.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.difficulty}>Dificultad: {item.challenge.difficulty}</Text>
          <Text style={styles.points}>{item.challenge.points} puntos</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const sortedMissions = routeData.journeys_missions.slice().sort((a, b) => {
    const orderA = a.order_index === undefined || a.order_index === null ? Infinity : a.order_index;
    const orderB = b.order_index === undefined || b.order_index === null ? Infinity : b.order_index;
    return orderA - orderB;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#005F9E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles de la Ruta</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.routeName}>{routeData.name}</Text>
        <Text style={styles.routeDescription}>{routeData.description}</Text>

        <Text style={styles.missionsTitle}>Misiones de la Ruta:</Text>
        {sortedMissions && sortedMissions.length > 0 ? (
          <FlatList
            data={sortedMissions}
            renderItem={renderMissionItem}
            keyExtractor={(item) => item.id}
            style={styles.missionsList}
          />
        ) : (
          <Text style={styles.noMissionsText}>No hay misiones asociadas a esta ruta.</Text>
        )}
      </View>

      <ImageUploadModal
        visible={showUploadModal}
        missionId={selectedMission?.id || ''}
        missionTitle={selectedMission?.challenge.title || ''}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      <MissionCompletedModal
        visible={missionCompleted}
        info={completedMissionInfo}
        onFinished={() => {
          setMissionCompleted(false);
        }}
      />

      <CompletingMissionModal
        visible={completingMission && !missionCompleted}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F9E',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  routeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 8,
  },
  routeDescription: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  missionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F9E',
    marginTop: 16,
    marginBottom: 12,
  },
  missionsList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  completedCard: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionOrderContainer: {
    backgroundColor: '#005F9E',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  missionOrderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  missionTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00264d',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  cardDescription: {
    color: '#00264d',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficulty: {
    color: '#005b99',
    fontSize: 12,
  },
  points: {
    color: '#005b99',
    fontWeight: 'bold',
  },
  noMissionsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  expiredCard: {
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#005F9E',
    marginTop: 4,
  },
  expiredTime: {
    color: '#D32F2F',
  },
});

export default RouteDetailScreen;
