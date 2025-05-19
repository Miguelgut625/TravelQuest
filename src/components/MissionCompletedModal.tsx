import React, { useState, useEffect, memo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MissionCompletedModalProps {
  visible: boolean;
  info: {
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
  } | null;
  onFinished?: () => void;
}

// Componente memorizado para evitar re-renderizaciones innecesarias
const MissionCompletedModal = memo(({ visible, info, onFinished }: MissionCompletedModalProps) => {
  // Si no hay info, no renderizar nada
  if (!info) return null;

  // Extraer solo lo que necesitamos para mostrar la descripción
  const journalContent = info.journalEntry?.content || '';
  const hasLongContent = journalContent.length > 100;
  const shortContent = hasLongContent ? journalContent.substring(0, 150) + '...' : journalContent;
  const imageUrl = info.journalEntry?.imageUrl;

  // Calcular porcentaje de XP para la barra de progreso
  const xpPercentage = Math.min(100, Math.max(0, (info.remainingXP / info.xpNext) * 100));
  
  // Estado para mostrar la descripción completa
  const [showFullDescription, setShowFullDescription] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onFinished}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Cabecera del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¡Misión Completada!</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onFinished}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Información de la misión */}
            <View style={styles.missionInfoContainer}>
              <Text style={styles.missionTitle}>{info.title}</Text>
              <Text style={styles.missionCity}>en {info.cityName}</Text>
            </View>

            {/* Imagen de la misión si existe */}
            {imageUrl && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.missionImage}
                  resizeMode="cover"
                />
              </View>
            )}
            
            {/* Descripción de la imagen si existe */}
            {journalContent && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Sobre esta imagen:</Text>
                <Text style={styles.descriptionContent}>
                  {showFullDescription ? journalContent : shortContent}
                </Text>
                {hasLongContent && (
                  <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                    <Text style={styles.readMoreText}>
                      {showFullDescription ? 'Mostrar menos' : 'Leer más'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Recompensas */}
            <View style={styles.rewardsContainer}>
              <Text style={styles.rewardsTitle}>Recompensas</Text>
              <View style={styles.rewardItem}>
                <Ionicons name="star" size={24} color="#FFC107" />
                <Text style={styles.rewardText}>{info.points} puntos</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="trophy" size={24} color="#4CAF50" />
                <Text style={styles.rewardText}>+{info.xpGained} XP</Text>
              </View>
            </View>

            {/* Información de nivel */}
            <View style={styles.levelContainer}>
              {info.levelUp ? (
                <Text style={styles.levelUpText}>
                  ¡Has subido al nivel {info.newLevel}! 🎉
                </Text>
              ) : (
                <Text style={styles.levelText}>
                  Te faltan {info.xpNext - info.remainingXP} XP para el siguiente nivel
                </Text>
              )}

              {/* Barra de progreso de XP */}
              <View style={styles.xpProgressBackground}>
                <View
                  style={[
                    styles.xpProgressFill,
                    { width: `${xpPercentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.xpText}>
                {info.remainingXP} / {info.xpNext} XP
              </Text>
            </View>

            {/* Botón para cerrar */}
            <TouchableOpacity style={styles.continueButton} onPress={onFinished}>
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  closeButton: {
    padding: 5,
  },
  missionInfoContainer: {
    marginBottom: 15,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  missionCity: {
    fontSize: 16,
    color: '#666',
  },
  imageContainer: {
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  missionImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  descriptionContainer: {
    marginVertical: 15,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 100,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  descriptionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  readMoreText: {
    marginTop: 10,
    color: '#005F9E',
    fontSize: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  rewardsContainer: {
    marginVertical: 15,
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0f0ff',
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#005F9E',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  levelContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  levelUpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  levelText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  xpProgressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  xpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  continueButton: {
    backgroundColor: '#005F9E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MissionCompletedModal; 