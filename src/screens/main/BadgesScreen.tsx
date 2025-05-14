import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { Badge, UserBadge, getUserBadges, checkAllBadges, updateUserTitle, getUserTitle } from '../../services/badgeService';
import BadgesList from '../../components/BadgesList';
import BadgeDetailModal from '../../components/BadgeDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { setUser } from '../../features/auth/authSlice';

interface BadgesScreenProps {
  navigation: any;
}

const BadgesScreen = ({ navigation }: BadgesScreenProps) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');

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

  const fetchCurrentTitle = async () => {
    if (!user?.id) return;
    const title = await getUserTitle(user.id);
    setCurrentTitle(title);
  };

  useEffect(() => {
    fetchBadges();
    fetchCurrentTitle();
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

  const handleSetTitle = async (title: string) => {
    if (!user?.id) return;
    
    const result = await updateUserTitle(user.id, title);
    
    if (result.success && result.user) {
      setCurrentTitle(title);
      dispatch(setUser({ ...user, custom_title: title }));
    } else {
      alert(result.error || 'No se pudo actualizar el título');
    }
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
          <Ionicons name="arrow-back" size={24} color="#7F5AF0" />
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
          onSetTitle={handleSetTitle}
          currentTitle={currentTitle}
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
    backgroundColor: '#181A20',
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2D2F3A',
  },
  rightPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5D90A',
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
    color: '#A0A0A0',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#2D2F3A',
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
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
    color: '#F5D90A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#2D2F3A',
  },
});

export default BadgesScreen; 