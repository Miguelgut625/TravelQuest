import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { Badge } from '../services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface BadgeDetailModalProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
}

const BadgeDetailModal = ({ visible, badge, onClose }: BadgeDetailModalProps) => {
  const { colors, isDarkMode } = useTheme();
  if (!badge) return null;

  // Obtener un icono predeterminado basado en la categoría
  const getBadgeIconByCategory = (category?: string): string => {
    switch (category) {
      case 'missions': return 'trophy-outline';
      case 'cities': return 'location-outline';
      case 'level': return 'star-outline';
      case 'social': return 'people-outline';
      case 'special': return 'diamond-outline';
      default: return 'medal-outline';
    }
  };

  const getCategoryName = (category: string): string => {
    const titles: Record<string, string> = {
      'missions': 'Misiones Completadas',
      'cities': 'Ciudades Visitadas',
      'level': 'Nivel del Explorador',
      'social': 'Logros Sociales',
      'special': 'Logros Especiales',
      'other': 'Otras Insignias'
    };
    return titles[category] || category;
  };

  const styles = getBadgeDetailModalStyles(colors, isDarkMode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.badgeHeader}>
            <View style={styles.badgeIconContainer}>
              {badge.icon ? (
                <Image
                  source={{ uri: badge.icon }}
                  style={styles.badgeIcon}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={getBadgeIconByCategory(badge.category)}
                  size={80}
                  color={colors.accent}
                />
              )}
            </View>
            <Text style={styles.badgeName}>{badge.name}</Text>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Categoría:</Text>
            <Text style={styles.categoryValue}>{getCategoryName(badge.category)}</Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Descripción:</Text>
            <Text style={styles.descriptionText}>{badge.description}</Text>
          </View>

          <View style={styles.thresholdContainer}>
            <Text style={styles.thresholdLabel}>Cómo se desbloquea:</Text>
            <Text style={styles.thresholdText}>
              {badge.category === 'missions' && `Completa ${badge.threshold} misiones`}
              {badge.category === 'cities' && `Visita ${badge.threshold} ciudades`}
              {badge.category === 'level' && `Alcanza el nivel ${badge.threshold}`}
              {badge.category === 'social' && `Obtén ${badge.threshold} amigos`}
              {badge.category === 'special' && badge.description}
              {!['missions', 'cities', 'level', 'social', 'special'].includes(badge.category) &&
                `Alcanza ${badge.threshold} puntos`}
            </Text>
          </View>

          {/*           <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.shareText}>Compartir Logro</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Modal>
  );
};

function getBadgeDetailModalStyles(colors, isDarkMode) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 15,
      padding: 20,
      width: '85%',
      maxHeight: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
    },
    badgeHeader: {
      alignItems: 'center',
      marginVertical: 20,
    },
    badgeIconContainer: {
      width: 120,
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 60,
      backgroundColor: isDarkMode ? colors.background : colors.background,
      marginBottom: 15,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: isDarkMode ? colors.accent : colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
    badgeIcon: {
      width: 114,
      height: 114,
    },
    badgeName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      textAlign: 'center',
    },
    categoryContainer: {
      flexDirection: 'row',
      marginBottom: 15,
    },
    categoryLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.primary : colors.primary,
      marginRight: 5,
    },
    categoryValue: {
      fontSize: 16,
      color: isDarkMode ? colors.accent : colors.secondary,
    },
    descriptionContainer: {
      marginBottom: 15,
    },
    descriptionLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.secondary : '#A0A0A0',
      marginBottom: 5,
    },
    descriptionText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.primary : colors.text.secondary,
    },
    thresholdContainer: {
      marginBottom: 0,
    },
    thresholdLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.secondary : '#A0A0A0',
      marginBottom: 5,
    },
    thresholdText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.primary : colors.text.secondary,
    },
  });
}

export default BadgeDetailModal; 