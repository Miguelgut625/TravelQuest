import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';
import { getLeaderboard, LeaderboardUser } from '../../services/leaderboardService';
import { Ionicons } from '@expo/vector-icons';

const LeaderboardScreen: React.FC = () => {
  const theme = useTheme();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard();
      setLeaderboardData(data);
    } catch (err) {
      setError('Error al cargar la clasificación');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: LeaderboardUser }) => (
    <View style={[
      styles.row,
      item.rank <= 3 ? styles.topThree : null,
      { backgroundColor: theme.colors.surface }
    ]}>
      <View style={styles.rankContainer}>
        <Text style={[
          styles.rankText,
          { color: item.rank <= 3 ? theme.colors.primary : theme.colors.onSurface }
        ]}>
          #{item.rank}
        </Text>
      </View>
      <View style={styles.userContainer}>
        <Text style={[styles.username, { color: theme.colors.onSurface }]}>
          {item.username}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="trophy-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.statText, { color: theme.colors.onSurface }]}>
              {item.points} pts
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.statText, { color: theme.colors.onSurface }]}>
              {item.completedMissions} misiones
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.statText, { color: theme.colors.onSurface }]}>
              {item.visitedCities} ciudades
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Top 10 Clasificación
      </Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadLeaderboard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topThree: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
  },
  userContainer: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LeaderboardScreen; 