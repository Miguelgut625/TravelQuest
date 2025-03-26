import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CompositeScreenProps, useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParams } from '../../navigation/AppNavigator';
import { SecondaryTabsParams } from '../../navigation/SecondaryTabsNavigator';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<SecondaryTabsParams, 'Home'>,
  NativeStackScreenProps<RootStackParams>
>;

export default function HomeScreen({ navigation }: Props) {
  const { token } = useSelector((state: RootState) => state.auth);

  const handleNavigation = (screen: keyof SecondaryTabsParams) => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate(screen);
  };

  useEffect(() => {
    if (!token) {
      navigation.navigate('Login');
    }
  }, [token, navigation]);

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

      {!token && (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.cardText, { color: colors.secondary }]}>Iniciar Sesión</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 30,
  },
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
    elevation: 5,
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
