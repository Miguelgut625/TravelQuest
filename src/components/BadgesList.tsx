import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Badge, UserBadge } from '../services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';

// Importar la imagen local

interface BadgesListProps {
  userBadges: UserBadge[];
  loading: boolean;
  onBadgePress?: (badge: Badge) => void;
}

const BadgesList = ({ userBadges, loading, onBadgePress }: BadgesListProps) => {
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
    padding: 10,
    backgroundColor: '#181A20',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A0A0A0',
    marginTop: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 5,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5D90A',
    marginLeft: 8,
  },
  badgeContainer: {
    marginBottom: 10,
  },
  badgeSurface: {
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    backgroundColor: '#2D2F3A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderRadius: 30,
    backgroundColor: '#181A20',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#7F5AF0',
  },
  badgeIcon: {
    width: 56,
    height: 56,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 3,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5D90A',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 4,
    lineHeight: 18,
  },
  unlockDate: {
    fontSize: 12,
    color: '#A0A0A0',
    fontStyle: 'italic',
  },
});

export default BadgesList; 