import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MissionInfo {
  title: string;
  points: number;
  cityName: string;
  levelUp?: boolean;
  newLevel?: number;
  xpGained?: number;
  remainingXP?: number;
  xpNext?: number;
}

interface MissionCompletedModalProps {
  visible: boolean;
  info: MissionInfo | null;
  onFinished?: () => void;
}

const MissionCompletedModal = ({ visible, info, onFinished }: MissionCompletedModalProps) => {
  if (!info) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.confettiContainer}>
            <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
          </View>
          
          <Text style={styles.modalTitle}>¡Misión Completada!</Text>
          <Text style={styles.modalText}>{info.title}</Text>
          <Text style={styles.modalCity}>en {info.cityName}</Text>
          <Text style={styles.modalPoints}>+{info.points} puntos</Text>
          <Text style={styles.modalXP}>+{info.xpGained || info.points} XP</Text>
          
          {info.levelUp && info.newLevel ? (
            <View style={styles.levelUpContainer}>
              <Text style={styles.levelUpText}>¡Has subido al nivel {info.newLevel}!</Text>
              
              {info.remainingXP !== undefined && info.xpNext !== undefined && (
                <View style={styles.xpProgressContainer}>
                  <View style={styles.xpProgressBar}>
                    <View 
                      style={[
                        styles.xpProgress, 
                        { width: `${(info.remainingXP / info.xpNext) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.xpProgressText}>
                    {info.remainingXP}/{info.xpNext} XP para nivel {info.newLevel + 1}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.xpProgressContainer}>
              {info.remainingXP !== undefined && info.xpNext !== undefined && (
                <>
                  <View style={styles.xpProgressBar}>
                    <View 
                      style={[
                        styles.xpProgress, 
                        { width: `${(info.remainingXP / info.xpNext) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.xpProgressText}>
                    {info.remainingXP}/{info.xpNext} XP para el siguiente nivel
                  </Text>
                </>
              )}
            </View>
          )}
          
          <TouchableOpacity
            style={styles.button}
            onPress={onFinished}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
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
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confettiContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalCity: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  modalPoints: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA000',
    marginBottom: 5,
  },
  modalXP: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginBottom: 10,
  },
  levelUpContainer: {
    marginTop: 10,
    backgroundColor: '#FFD700',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  levelUpText: {
    color: '#7B4513',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  xpProgressContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#5C6BC0',
    borderRadius: 4,
  },
  xpProgressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MissionCompletedModal; 