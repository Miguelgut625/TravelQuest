import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMissionHint, HINT_COST } from '../services/missionService';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { useTheme } from '../context/ThemeContext';
import { getMissionModalsStyles } from '../styles/theme';
import { useWindowDimensions } from 'react-native';

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
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = getMissionModalsStyles(colors, isDarkMode, width);

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
              setHint(hintData.hint);
            } catch (error: any) {
              console.error('Error al obtener pista:', error);
              setError(error.message || 'No se pudo obtener la pista. Verifica que tengas suficientes puntos.');
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pistas para la misión</Text>
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDarkMode ? colors.surface : '#fff',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.10,
                shadowRadius: 2,
                elevation: 2,
                marginLeft: 8,
              }}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={isDarkMode ? colors.accent : colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Nombre de la misión */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: isDarkMode ? colors.accent : colors.primary,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {missionTitle}
          </Text>

          {/* Tarjeta de pista */}
          {!hint && !loading && !error && (
            <View
              style={{
                backgroundColor: isDarkMode ? colors.surface : '#FFF9E3',
                borderRadius: 14,
                padding: 18,
                marginVertical: 18,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
                width: '100%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                <Ionicons name="bulb" size={28} color={colors.accent} style={{ marginRight: 12, marginTop: 2 }} />
                <Text style={{ fontSize: 16, color: colors.text.primary, fontWeight: '400', flex: 1, textAlign: 'left' }}>
                  Obtén una pista específica generada por IA para completar esta misión.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, color: colors.text.secondary, marginRight: 4 }}>Costo:</Text>
                <Text style={{ fontSize: 15, color: colors.accent, fontWeight: 'bold' }}>{HINT_COST} puntos</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  {
                    alignSelf: 'center',
                    minWidth: 160,
                    backgroundColor: isDarkMode ? colors.accent : colors.primary,
                  },
                ]}
                onPress={handleGetHint}
              >
                <Text style={[styles.mainButtonText, { color: colors.surface }]}>Obtener Pista</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loader */}
          {loading && (
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 15, fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
                Generando pista...
              </Text>
            </View>
          )}

          {/* Resultado de pista */}
          {hint && (
            <View style={{
              alignItems: 'center',
              padding: 18,
              backgroundColor: isDarkMode ? colors.surface : '#F3F7FF',
              borderRadius: 14,
              marginVertical: 18
            }}>
              <Ionicons name="information-circle" size={30} color={isDarkMode ? colors.accent : colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDarkMode ? colors.accent : colors.primary, marginBottom: 6 }}>Tu pista:</Text>
              <Text style={{ fontSize: 15, color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}>{hint}</Text>
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  { alignSelf: 'center', minWidth: 120, backgroundColor: isDarkMode ? colors.accent : colors.primary },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.mainButtonText, { color: colors.surface }]}>Entendido</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={{ alignItems: 'center', padding: 18, backgroundColor: isDarkMode ? colors.error + '22' : '#FFEBEE', borderRadius: 14, marginVertical: 18 }}>
              <Ionicons name="warning" size={30} color={colors.error} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.error, marginBottom: 6 }}>No se pudo obtener la pista</Text>
              <Text style={{ fontSize: 15, color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}>{error}</Text>
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  { alignSelf: 'center', minWidth: 120, backgroundColor: colors.error },
                ]}
                onPress={() => setError(null)}
              >
                <Text style={[styles.mainButtonText, { color: colors.surface }]}>Volver a intentar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MissionHintModal; 