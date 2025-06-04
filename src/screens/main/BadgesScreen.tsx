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
import { useTheme } from '../../context/ThemeContext';
import { getBadgesScreenStyles } from '../../styles/theme';

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
  const { colors, isDarkMode } = useTheme();
  const styles = getBadgesScreenStyles(colors, isDarkMode, width);
  const headerPaddingTop = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 24;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color={isDarkMode ? colors.background : '#fff'} />
          </TouchableOpacity>
          <Text style={styles.title}>Mis Insignias</Text>
          <View style={styles.rightPlaceholder} />
        </View>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{userBadges.length}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
              {width < 350 ? 'Conseguidas' : 'Insignias Conseguidas'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{userBadges.filter(b => b.badges?.category === 'missions').length}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
              {width < 350 ? 'Misiones' : 'Insignias de Misiones'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{userBadges.filter(b => b.badges?.category === 'level').length}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
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
    </SafeAreaView>
  );
};

export default BadgesScreen; 