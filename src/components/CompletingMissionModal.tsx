import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';

interface CompletingMissionModalProps {
  visible: boolean;
}

const CompletingMissionModal = ({ visible }: CompletingMissionModalProps) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingTitle}>Completando misión</Text>
          <Text style={styles.loadingDescription}>
            Estamos guardando tu progreso...
          </Text>
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
  loadingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '85%',
    maxWidth: 300,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingDescription: {
    color: '#666',
    textAlign: 'center',
  }
});

export default CompletingMissionModal; 