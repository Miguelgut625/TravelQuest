import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MissionCompletedModalProps {
  visible: boolean;
  missionInfo: {
    title: string;
    points: number;
    cityName: string;
  } | null;
  onFinished: () => void;
}

const MissionCompletedModal = ({ visible, missionInfo, onFinished }: MissionCompletedModalProps) => {
  // Efecto para cerrar el modal después de 3 segundos
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onFinished();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onFinished]);

  // Animación de la barra de progreso
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    if (visible) {
      setWidth(0);
      const timer = setTimeout(() => {
        setWidth(100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={70} color="#005F9E" />
          <Text style={styles.successTitle}>¡Misión completada!</Text>
          {missionInfo && (
            <>
              <Text style={styles.successMissionTitle}>{missionInfo.title}</Text>
              <Text style={styles.successCityName}>{missionInfo.cityName}</Text>
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsLabel}>+ </Text>
                <Text style={styles.pointsValue}>{missionInfo.points}</Text>
                <Text style={styles.pointsLabel}> puntos</Text>
              </View>
            </>
          )}
          <Text style={styles.successHint}>
            Redirigiendo al diario de viaje para ver tus logros...
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressAnimation, { width: `${width}%` }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '85%',
    maxWidth: 350,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005F9E',
    marginTop: 10,
    marginBottom: 15,
  },
  successMissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  successCityName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  pointsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFB74D',
  },
  successHint: {
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressAnimation: {
    height: '100%',
    backgroundColor: '#005F9E',
    borderRadius: 10,
  },
});

export default MissionCompletedModal; 