import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Badge, UserBadge } from '../services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';

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
          <View style={styles.badgeIconContainer}>
            {badge.icon ? (
              <Image 
                source={{ uri: badge.icon }} 
                style={styles.badgeIcon} 
                resizeMode="contain"
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
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
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
    color: '#666',
    marginTop: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#888',
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
    color: '#333',
    marginLeft: 8,
  },
  badgeContainer: {
    marginBottom: 10,
  },
  badgeSurface: {
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    elevation: 2,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  badgeIcon: {
    width: 50,
    height: 50,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  unlockDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default BadgesList; 