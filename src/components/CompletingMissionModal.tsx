import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';

interface CompletingMissionModalProps {
  visible: boolean;
}

const CompletingMissionModal = ({ 
  visible
}: CompletingMissionModalProps) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size={40} color="#005F9E" />
          <Text style={styles.loadingTitle}>Procesando</Text>
          <Text style={styles.loadingDescription}>
            Guardando tu progreso...
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
    color: '#005F9E',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingDescription: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  }
});

export default CompletingMissionModal; 