import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { Badge, UserBadge, getUserBadges, checkAllBadges } from '../../services/badgeService';
import BadgesList from '../../components/BadgesList';
import BadgeDetailModal from '../../components/BadgeDetailModal';
import { Ionicons } from '@expo/vector-icons';

interface BadgesScreenProps {
  navigation: any;
}

const BadgesScreen = ({ navigation }: BadgesScreenProps) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchBadges = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Verificar y otorgar nuevas insignias si corresponde
      await checkAllBadges(user.id);
      
      // Obtener las insignias actualizadas del usuario
      const badges = await getUserBadges(user.id);
      setUserBadges(badges);
    } catch (error) {
      console.error('Error al cargar insignias:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBadges();
  };

  const handleBadgePress = (badge: Badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando insignias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Insignias</Text>
        <View style={styles.rightPlaceholder} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{userBadges.length}</Text>
            <Text style={styles.summaryLabel}>Insignias Conseguidas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {userBadges.filter(b => b.badges?.category === 'missions').length}
            </Text>
            <Text style={styles.summaryLabel}>Insignias de Misiones</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {userBadges.filter(b => b.badges?.category === 'level').length}
            </Text>
            <Text style={styles.summaryLabel}>Insignias de Nivel</Text>
          </View>
        </View>

        <BadgesList
          userBadges={userBadges}
          loading={refreshing}
          onBadgePress={handleBadgePress}
        />

        <BadgeDetailModal
          visible={modalVisible}
          badge={selectedBadge}
          onClose={handleCloseModal}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  rightPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#eee',
  },
});

export default BadgesScreen; 