// @ts-nocheck
import React from 'react';
// @ts-ignore
import { NavigationContainer } from '@react-navigation/native';
// @ts-ignore
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyCodeScreen from '../screens/auth/VerifyCodeScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import MapScreen from '../screens/main/MapScreen';
import MissionsScreen from '../screens/main/MissionsScreen';
import JournalScreen from '../screens/main/JournalScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import BadgesScreen from '../screens/main/BadgesScreen';
import GroupsScreen from '../screens/main/GroupsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { View, ActivityIndicator, Text, Platform, StatusBar } from 'react-native';
import ChatScreen from '../screens/main/ChatScreen';
import ConversationsScreen from '../screens/main/ConversationsScreen';
import { linking } from './linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FriendProfileScreen from '../screens/main/FriendProfileScreen';

// Define los parámetros para las pestañas principales
export type TabParamList = {
  Map: undefined;
  Missions: {
    journeyId?: string;
    challenges?: any[];
  };
  Journal: {
    refresh?: boolean;
  };
  Profile: undefined;
  Leaderboard: undefined;
  Friends: undefined;
  Groups: undefined;
  Conversations: undefined;
  Chat: {
    friendId: string;
    friendName: string;
  };
  Badges: undefined;
};

type RootStackParamList = {
  TabNavigator: undefined;
  Chat: {
    friendId: string;
    friendName: string;
  };
  BadgesScreen: undefined;
  Friends: undefined;
  Leaderboard: undefined;
  FriendProfile: {
    friendId: string;
    friendName: string;
  };
};

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyCode: { email: string };
  VerifyEmail: { email: string };
  ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Componente Placeholder para ProfileScreen
const ProfilePlaceholder = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 20, color: '#005F9E', marginBottom: 20 }}>Perfil</Text>
      <Text style={{ color: '#666' }}>Contenido temporalmente no disponible</Text>
    </View>
  );
};

// Creamos un componente para el flujo principal que incluya el chat
const MainFlow = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TabNavigator"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: 'white',
        }}
      />
      <Stack.Screen
        name="BadgesScreen"
        component={BadgesScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="FriendProfile"
        component={FriendProfileScreen}
        options={{
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

// Componente separado para el navegador de pestañas
// @ts-ignore
const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'help-circle';

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Missions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Journal') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Conversations') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }

          // @ts-ignore
          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 : 56,
          paddingBottom: Platform.OS === 'ios' ? 25 : 7,
          paddingTop: 7,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Mapa'
        }}
      />
      <Tab.Screen 
        name="Missions" 
        component={MissionsScreen}
        options={{
          title: 'Misiones'
        }}
      />
      <Tab.Screen 
        name="Journal" 
        component={JournalScreen} 
        initialParams={{ refresh: false }}
        options={{
          title: 'Diario'
        }}
      />
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Mensajes'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Perfil'
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#005F9E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#005F9E"
        translucent={true}
      />
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <Stack.Screen name="TabNavigator" component={TabNavigator} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="BadgesScreen" component={BadgesScreen} />
              <Stack.Screen name="Friends" component={FriendsScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppNavigator; 