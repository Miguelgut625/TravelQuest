import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Badge, UserBadge } from '../services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';
import { colors, commonStyles, typography, spacing, shadows, borderRadius } from '../styles/theme';

interface BadgesListProps {
  userBadges: UserBadge[];
  loading: boolean;
  onBadgePress?: (badge: Badge) => void;
  onSetTitle?: (title: string) => void;
  currentTitle?: string;
}

const BadgesList = ({ userBadges, loading, onBadgePress, onSetTitle, currentTitle }: BadgesListProps) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando insignias...</Text>
      </View>
    );
  }

  if (userBadges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="medal-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>Aún no has ganado ninguna insignia</Text>
        <Text style={styles.tipText}>¡Completa misiones para desbloquear insignias!</Text>
      </View>
    );
  }

  // Agrupar las insignias por categoría
  const badgesByCategory: Record<string, UserBadge[]> = {};
  userBadges.forEach(badge => {
    const category = badge.badges?.category || 'other';
    if (!badgesByCategory[category]) {
      badgesByCategory[category] = [];
    }
    badgesByCategory[category].push(badge);
  });

  const renderCategoryHeader = (category: string) => {
    const titles: Record<string, string> = {
      'missions': 'Misiones Completadas',
      'cities': 'Ciudades Visitadas',
      'level': 'Nivel del Explorador',
      'social': 'Logros Sociales',
      'special': 'Logros Especiales',
      'other': 'Otras Insignias'
    };

    const icons: Record<string, any> = {
      'missions': 'trophy-outline',
      'cities': 'location-outline',
      'level': 'star-outline',
      'social': 'people-outline',
      'special': 'diamond-outline',
      'other': 'medal-outline'
    };

    return (
      <View style={styles.categoryHeader}>
        <Ionicons name={icons[category] || 'medal-outline'} size={20} color="#4CAF50" />
        <Text style={styles.categoryTitle}>{titles[category] || category}</Text>
      </View>
    );
  };

  const renderBadge = (userBadge: UserBadge) => {
    const badge = userBadge.badges;
    if (!badge) return null;

    const isCurrentTitle = currentTitle === badge.name;

    return (
      <TouchableOpacity
        style={styles.badgeContainer}
        onPress={() => onBadgePress && onBadgePress(badge)}
      >
        <Surface style={styles.badgeSurface}>
          <View style={styles.badgeContent}>
            <View style={styles.badgeIconContainer}>
              {typeof badge.icon === 'string' ? (
                <Image
                  source={{ uri: badge.icon }}
                  style={styles.badgeIcon}
                  resizeMode="cover"
                />
              ) : typeof badge.icon === 'number' || (typeof badge.icon === 'object' && badge.icon !== null) ? (
                <Image
                  source={badge.icon}
                  style={styles.badgeIcon}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={getBadgeIconByCategory(badge.category)}
                  size={40}
                  color="#4CAF50"
                />
              )}
            </View>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
              <Text style={styles.unlockDate}>
                Desbloqueada: {new Date(userBadge.unlocked_at).toLocaleDateString()}
              </Text>
              {onSetTitle && (
                <TouchableOpacity
                  style={[styles.setTitleButton, isCurrentTitle && styles.setTitleButtonActive]}
                  onPress={() => onSetTitle(badge.name)}
                  disabled={isCurrentTitle}
                >
                  <Text style={[styles.setTitleButtonText, isCurrentTitle && styles.setTitleButtonTextActive]}>
                    {isCurrentTitle ? 'Título actual' : 'Usar como título'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  // Obtener un icono predeterminado basado en la categoría
  const getBadgeIconByCategory = (category?: string): any => {
    switch (category) {
      case 'missions': return 'trophy-outline';
      case 'cities': return 'location-outline';
      case 'level': return 'star-outline';
      case 'social': return 'people-outline';
      case 'special': return 'diamond-outline';
      default: return 'medal-outline';
    }
  };

  return (
    <View style={styles.container}>
      {Object.entries(badgesByCategory).map(([category, badges]) => (
        <View key={category} style={styles.categoryContainer}>
          {renderCategoryHeader(category)}
          {badges.map(badge => (
            <View key={badge.id}>
              {renderBadge(badge)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    ...commonStyles.loadingContainer,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text.light,
    ...typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    ...commonStyles.emptyContainer,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyText: {
    ...commonStyles.emptyText,
    ...typography.body,
    color: colors.text.light,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  tipText: {
    ...typography.caption,
    color: colors.text.light,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  categoryTitle: {
    ...typography.h2,
    color: colors.text.light,
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },
  badgeContainer: {
    marginBottom: spacing.sm,
  },
  badgeSurface: {
    ...commonStyles.card,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
    borderRadius: 32,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.text.light,
    ...shadows.small,
  },
  badgeIcon: {
    width: 60,
    height: 60,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  badgeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  badgeDescription: {
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  unlockDate: {
    fontSize: 13,
    color: colors.secondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  setTitleButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 4,
  },
  setTitleButtonActive: {
    backgroundColor: colors.success,
  },
  setTitleButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  setTitleButtonTextActive: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default BadgesList; 