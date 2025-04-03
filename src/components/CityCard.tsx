import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../screens/main/styles';

const CityCard = ({
  cityName,
  totalMissions,
  completedMissions,
  expiredMissions,
  onPress,
}: {
  cityName: string;
  totalMissions: number;
  completedMissions: number;
  expiredMissions: number;
  onPress: () => void;
}) => {
  const completedPercentage = (completedMissions / totalMissions) * 100;
  const expiredPercentage = (expiredMissions / totalMissions) * 100;
  const pendingPercentage = 100 - completedPercentage - expiredPercentage;

  return (
    <TouchableOpacity style={styles.cityCard} onPress={onPress}>
      <View style={styles.cityCardContent}>
        <View style={styles.cityInfo}>
          <Text style={styles.cityName}>{cityName}</Text>
          <Text style={styles.missionCount}>
            {completedMissions}/{totalMissions} completadas
          </Text>
          {expiredMissions > 0 && (
            <Text style={styles.expiredCount}>
              {expiredMissions} expiradas
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={24} color="#666" />
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFillCompleted, { width: `${completedPercentage}%` }]} />
        <View style={[styles.progressFillExpired, { width: `${expiredPercentage}%`, left: `${completedPercentage}%` }]} />
        <View style={[styles.progressFillPending, { width: `${pendingPercentage}%`, left: `${completedPercentage + expiredPercentage}%` }]} />
      </View>
    </TouchableOpacity>
  );
};

export default CityCard;
