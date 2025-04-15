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
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { View, ActivityIndicator, Text } from 'react-native';
import ChatScreen from '../screens/main/ChatScreen';
import ConversationsScreen from '../screens/main/ConversationsScreen';
import { linking } from './linking';

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
  Conversations: undefined;
  Chat: {
    friendId: string;
    friendName: string;
  };
  BadgesScreen: undefined;
};

type RootStackParamList = {
  TabNavigator: undefined;
  Chat: {
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
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Conversations') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'BadgesScreen') {
            iconName = focused ? 'medal' : 'medal-outline';
          }

          // @ts-ignore
          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Map'
        }}
      />
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} initialParams={{ refresh: false }} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Mensajes'
        }}
      />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen 
        name="BadgesScreen" 
        component={BadgesScreen}
        options={{
          title: 'Insignias'
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { authState } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();

  // Si el estado de autenticación es 'loading', mostrar un indicador de carga
  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={24} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {authState === 'authenticated' ? (
        <MainFlow />
      ) : (
        <AuthStack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator; 