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
import CreateMissionScreen from '../screens/admin/CreateMissionScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Paleta de colores corporativa
const colors = {
  primary: '#003580',      // Azul oscuro (corporativo)
  secondary: '#0071c2',    // Azul brillante (para botones y acentos)
  background: '#ffffff',   // Blanco como fondo principal
  white: '#FFFFFF',        // Blanco neutro reutilizable
  text: {
    primary: '#00264d',    // Azul muy oscuro (para alta legibilidad)
    secondary: '#005b99',  // Azul medio (texto secundario)
    light: '#66a3ff',      // Azul claro (detalles decorativos o descripciones)
  },
  border: '#66b3ff',       // Azul claro (para bordes y separadores)
  success: '#38b000',      // Verde vibrante (indicadores positivos)
  error: '#e63946',        // Rojo vivo (errores y alertas)
};

const MainFlow = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';
  console.log('Estado del usuario:', user);

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
      {isAdmin && (
        <Stack.Screen 
          name="CreateMission" 
          component={CreateMissionScreen} 
          options={{ 
            headerShown: false,
            title: 'Crear Misión'
          }} 
        />
      )}
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';
  console.log('Estado del usuario en TabNavigator:', user);

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
        tabBarActiveTintColor: colors.text.light,         
        tabBarInactiveTintColor: colors.white,      
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          backgroundColor: colors.primary, 
          elevation: 8,
          shadowColor: colors.text.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
          color: colors.white,
        },
      })}
    >

      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Mapa' }} />
      <Tab.Screen name="Missions" component={MissionsScreen} options={{ title: 'Misiones' }} />
      <Tab.Screen name="Journal" component={JournalScreen} initialParams={{ refresh: false }} options={{ title: 'Diario' }} />
      <Tab.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Mensajes' }} />
      {isAdmin && (
        <Tab.Screen 
          name="CreateMission" 
          component={CreateMissionScreen} 
          options={{ 
            title: 'Crear Misión',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons 
                name={focused ? 'add-circle' : 'add-circle-outline'} 
                size={26} 
                color={color} 
              />
            ),
          }} 
        />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { authState } = useSelector((state: RootState) => state.auth);

  if (authState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size={24} color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={true} />
      <NavigationContainer linking={linking} theme={{
        dark: false,
        colors: {
          background: colors.background,
          border: colors.border,
          card: colors.white,
          text: colors.text.primary,
          notification: colors.primary,
          primary: colors.primary,
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