import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getMissionModalsStyles } from '../styles/theme';
import { useWindowDimensions } from 'react-native';

interface CompletingMissionModalProps {
  visible: boolean;
}

const CompletingMissionModal = ({
  visible
}: CompletingMissionModalProps) => {
  if (!visible) return null;

  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = getMissionModalsStyles(colors, isDarkMode, width);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size={40} color={colors.primary} />
          <Text style={styles.loadingTitle}>Procesando</Text>
          <Text style={styles.loadingDescription}>
            Guardando tu progreso...
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default CompletingMissionModal; 