import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { JourneyMission } from '../types/journey';
import styles from '../screens/main/styles';

const getTimeRemaining = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return { isExpired: true, text: 'Tiempo expirado' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return { isExpired: false, text: `${days} días restantes` };
  if (hours > 0) return { isExpired: false, text: `${hours} horas restantes` };
  return { isExpired: false, text: `${minutes} minutos restantes` };
};

const MissionCard = ({
  mission,
  onComplete,
}: {
  mission: JourneyMission;
  onComplete: () => void;
}) => {
  const timeRemaining = getTimeRemaining(mission.end_date);
  const isExpired = timeRemaining.isExpired && !mission.completed;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        mission.completed && styles.completedCard,
        isExpired && styles.expiredCard,
      ]}
      onPress={() => !mission.completed && !isExpired && onComplete()}
      disabled={mission.completed || isExpired}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{mission.challenge.title}</Text>
        <View style={styles.badgeContainer}>
          <Text
            style={[
              styles.badge,
              {
                backgroundColor: mission.completed
                  ? '#4CAF50'
                  : isExpired
                  ? '#f44336'
                  : '#FFA000',
              },
            ]}
          >
            {mission.completed ? 'Completada' : isExpired ? 'Expirada' : 'Pendiente'}
          </Text>
          <Text style={[styles.timeRemaining, isExpired && styles.expiredTime]}>
            {timeRemaining.text}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>{mission.challenge.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.difficulty}>Dificultad: {mission.challenge.difficulty}</Text>
        <Text style={styles.points}>{mission.challenge.points} puntos</Text>
      </View>
    </TouchableOpacity>
  );
};

export default MissionCard;
