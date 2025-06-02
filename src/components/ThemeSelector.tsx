import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: 'light', label: 'Claro', icon: 'sunny' },
    { id: 'dark', label: 'Oscuro', icon: 'moon' },
    { id: 'system', label: 'Sistema', icon: 'phone-portrait' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tema de la aplicación</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              theme === option.id && styles.selectedOption,
            ]}
            onPress={() => setTheme(option.id as 'light' | 'dark' | 'system')}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color={theme === option.id ? colors.surface : colors.text.primary}
            />
            <Text
              style={[
                styles.optionText,
                theme === option.id && styles.selectedOptionText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text.primary,
  },
  selectedOptionText: {
    color: colors.surface,
    fontWeight: 'bold',
  },
}); 