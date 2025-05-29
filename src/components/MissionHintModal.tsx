import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMissionHint, HINT_COST } from '../services/missionService';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

interface MissionHintModalProps {
  visible: boolean;
  onClose: () => void;
  missionId: string;
  missionTitle: string;
}

const MissionHintModal: React.FC<MissionHintModalProps> = ({ visible, onClose, missionId, missionTitle }) => {
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  const handleGetHint = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para obtener pistas.');
      return;
    }

    // Confirmar que el usuario quiere gastar puntos
    Alert.alert(
      'Obtener pista',
      `¿Quieres gastar ${HINT_COST} puntos para obtener una pista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Obtener pista', 
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);
              
              const hintData = await getMissionHint(user.id, missionId);
              if (!hintData || !hintData.hint) {
                throw new Error('No se pudo obtener una pista válida');
              }
              setHint(hintData.hint);
            } catch (error: any) {
              console.error('Error al obtener pista:', error);
              let errorMessage = 'No se pudo obtener la pista. ';
              
              if (error.response?.status === 400) {
                errorMessage += 'Verifica que tengas suficientes puntos.';
              } else if (error.response?.status === 404) {
                errorMessage += 'La misión no fue encontrada.';
              } else {
                errorMessage += 'Inténtalo de nuevo más tarde.';
              }
              
              setError(errorMessage);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pistas para la misión</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.missionTitle}>{missionTitle}</Text>

          {!hint && !loading && !error && (
            <View style={styles.hintContainer}>
              <Ionicons name="bulb" size={40} color="#FFB900" style={styles.hintIcon} />
              <Text style={styles.hintInfo}>
                Obtén una pista específica generada por IA para completar esta misión.
              </Text>
              <Text style={styles.costInfo}>
                Costo: {HINT_COST} puntos
              </Text>
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleGetHint}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Obtener Pista</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#005F9E" />
              <Text style={styles.loadingText}>Generando pista...</Text>
            </View>
          )}

          {hint && (
            <View style={styles.hintResultContainer}>
              <Ionicons name="information-circle" size={30} color="#005F9E" style={styles.infoIcon} />
              <Text style={styles.hintTitle}>Tu pista:</Text>
              <Text style={styles.hintText}>{hint}</Text>
              <TouchableOpacity style={[styles.button, styles.closeHintButton]} onPress={onClose}>
                <Text style={styles.buttonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={30} color="#D32F2F" style={styles.warningIcon} />
              <Text style={styles.errorTitle}>No se pudo obtener la pista</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={[styles.button, styles.tryAgainButton]} 
                onPress={() => {
                  setError(null);
                  handleGetHint();
                }}
              >
                <Text style={styles.buttonText}>Volver a intentar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 5
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555',
    marginBottom: 20,
    textAlign: 'center'
  },
  hintContainer: {
    alignItems: 'center',
    padding: 20
  },
  hintIcon: {
    marginBottom: 15
  },
  hintInfo: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10
  },
  costInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 20
  },
  button: {
    backgroundColor: '#005F9E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 10
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#005F9E',
    fontSize: 16
  },
  hintResultContainer: {
    padding: 20
  },
  infoIcon: {
    marginBottom: 15,
    alignSelf: 'center'
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  hintText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
  closeHintButton: {
    backgroundColor: '#4CAF50'
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center'
  },
  warningIcon: {
    marginBottom: 15
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 10
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  tryAgainButton: {
    backgroundColor: '#D32F2F'
  }
});

export default MissionHintModal; 