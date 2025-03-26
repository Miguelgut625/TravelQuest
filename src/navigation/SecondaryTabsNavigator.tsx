import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import MissionsScreen from '../screens/main/MissionsScreen';
import JournalScreen from '../screens/main/JournalScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type SecondaryTabsParams = {
  Home: undefined;
  Map: undefined;
  Missions: undefined;
  Journal: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<SecondaryTabsParams>();

export default function SecondaryTabsNavigator({ navigation }: any) {
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!token) {
      navigation.navigate('Login');
    }
  }, [token, navigation]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#005F9E',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} />
          ),
        }}
      />

      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} />
          ),
        }}
      />

      <Tab.Screen
        name="Missions"
        component={MissionsScreen}
        options={{
          title: 'Misiones',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'flag' : 'flag-outline'} size={24} />
          ),
        }}
      />

      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          title: 'Diario',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={24} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}