import React, { useState, useEffect, memo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getMissionModalsStyles } from '../styles/theme';
import { useWindowDimensions } from 'react-native';

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

  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = getMissionModalsStyles(colors, isDarkMode, width);

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

export default MissionCompletedModal; 