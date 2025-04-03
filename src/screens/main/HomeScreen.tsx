import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types'
import { SecondaryTabsParams } from '../../navigation/SecondaryTabsNavigator';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import styles from './styles';

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<SecondaryTabsParams, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const { user, authState } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = authState === 'authenticated';

  const handleNavigation = (screen: keyof SecondaryTabsParams) => {
    if (!isAuthenticated) {
      navigation.getParent()?.navigate('Login');
      return;
    }
    navigation.navigate(screen as any);
  };

  useEffect(() => {
    if (!isAuthenticated && !user) {
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('Login');
      }
    }
  }, [isAuthenticated, user, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menú Principal</Text>

      <TouchableOpacity style={styles.card} onPress={() => handleNavigation('Map')}>
        <Text style={styles.cardText}>Ir al Mapa</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => handleNavigation('Missions')}>
        <Text style={styles.cardText}>Ir a Misiones</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => handleNavigation('Journal')}>
        <Text style={styles.cardText}>Ir al Diario</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => handleNavigation('Profile')}>
        <Text style={styles.cardText}>Ir al Perfil</Text>
      </TouchableOpacity>

      {!isAuthenticated && (
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.primary }]} 
          onPress={() => navigation.getParent()?.navigate('Login')}
        >
          <Text style={[styles.cardText, { color: colors.secondary }]}>Iniciar Sesión</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}