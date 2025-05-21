// @ts-nocheck
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import JournalEntryDetailScreen from '../screens/main/JournalEntryDetailScreen';
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
import GroupChatScreen from '../screens/main/GroupChatScreen';
import FriendProfileScreen from '../screens/main/FriendProfileScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainFlow = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TabNavigator" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="JournalEntryDetail" component={JournalEntryDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BadgesScreen" component={BadgesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Map') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Missions') iconName = focused ? 'flag' : 'flag-outline';
          else if (route.name === 'Journal') iconName = focused ? 'reader' : 'reader-outline';
          else if (route.name === 'Conversations') iconName = focused ? 'chatbox' : 'chatbox-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarActiveTintColor: '#A8DADC',         // Azul oscuro
        tabBarInactiveTintColor: '#A8DADC',       // Azul claro pastel
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          backgroundColor: '#26547C',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      })}
    >

      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Mapa' }} />
      <Tab.Screen name="Missions" component={MissionsScreen} options={{ title: 'Misiones' }} />
      <Tab.Screen name="Journal" component={JournalScreen} initialParams={{ refresh: false }} options={{ title: 'Diario' }} />
      <Tab.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Mensajes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { authState } = useSelector((state: RootState) => state.auth);

  if (authState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size={24} color="#005F9E" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
      <NavigationContainer linking={linking} theme={{
        dark: false,
        colors: {
          background: '#FFFFFF',
          border: '#e5e5e5',
          card: '#FFFFFF',
          text: '#222222',
          notification: '#005F9E',
          primary: '#005F9E',
        },
      }}>
        {authState === 'authenticated' ? (
          <MainFlow />
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <AuthStack.Screen name="VerifyCode" component={VerifyCodeScreen} />
            <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </AuthStack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppNavigator;