import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { Badge, UserBadge, getUserBadges, checkAllBadges } from '../../services/badgeService';
import BadgesList from '../../components/BadgesList';
import BadgeDetailModal from '../../components/BadgeDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { setUser } from '../../features/auth/authSlice';
import { supabase } from '../../services/supabase';
import { SafeAreaView, Platform, StatusBar } from 'react-native';

interface BadgesScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get('window');


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
    const { data, error } = await supabase
      .from('users')
      .select('custom_title')
      .eq('id', user.id)
      .single();
    if (!error && data?.custom_title) {
      setCurrentTitle(data.custom_title);
    }
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
    const { error } = await supabase
      .from('users')
      .update({ custom_title: title })
      .eq('id', user.id);
    if (!error) {
      setCurrentTitle(title);
      dispatch(setUser({ ...user, custom_title: title }));
    } else {
      alert('No se pudo actualizar el título');
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
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Mis Insignias</Text>
          <View style={styles.rightPlaceholder} />
        </View>
      </SafeAreaView>
      <ScrollView style={styles.content}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{userBadges.length}</Text>
            <Text
              style={styles.summaryLabel}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {width < 350 ? 'Conseguidas' : 'Insignias Conseguidas'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {userBadges.filter(b => b.badges?.category === 'missions').length}
            </Text>
            <Text
              style={styles.summaryLabel}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {width < 350 ? 'Misiones' : 'Insignias de Misiones'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {userBadges.filter(b => b.badges?.category === 'level').length}
            </Text>
            <Text
              style={styles.summaryLabel}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {width < 350 ? 'Nivel' : 'Insignias de Nivel'}
            </Text>
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

const colors = {
  primary: '#26547C',      // Azul oscuro (fuerte pero amigable)
  secondary: '#70C1B3',    // Verde agua (fresco y cálido)
  background: '#F1FAEE',   // Verde muy claro casi blanco (limpio y suave)
  white: '#FFFFFF',        // Blanco neutro
  text: {
    primary: '#1D3557',    // Azul muy oscuro (excelente legibilidad)
    secondary: '#52B788',  // Verde medio (agradable para texto secundario)
    light: '#A8DADC',      // Verde-azulado pastel (ligero, decorativo)
  },
  border: '#89C2D9',       // Azul claro (suave y limpio)
  success: '#06D6A0',      // Verde menta (positivo y moderno)
  error: '#FF6B6B',        // Rojo coral (alerta suave y visualmente amigable)
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeHeader: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  backButton: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPlaceholder: {
    width: 32,
  },
  title: {
    fontSize: width < 400 ? 20 : 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  summaryValue: {
    fontSize: width < 350 ? 18 : 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: width < 350 ? 11 : 14,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.primary,
    marginHorizontal: 4,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  badgeItem: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    marginVertical: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: colors.text.light,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 10,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BadgesScreen; 