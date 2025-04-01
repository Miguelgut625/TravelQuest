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
import ProfileScreen from '../screens/main/ProfileScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { View, ActivityIndicator } from 'react-native';

type TabParamList = {
  Map: undefined;
  Missions: {
    journeyId: string;
    challenges: any[];
  };
  Journal: undefined;
  Profile: undefined;
  Leaderboard: undefined;
  Friends: undefined;
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

const AppNavigator = () => {
  const { authState } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();

  // Si el estado de autenticación es 'loading', mostrar un indicador de carga
  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {authState === 'authenticated' ? (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

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
              }
              

              return <Ionicons name={iconName as any} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Missions" component={MissionsScreen} />
          <Tab.Screen name="Journal" component={JournalScreen} />
          <Tab.Screen name="Friends" component={FriendsScreen} />
          <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
          
        </Tab.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator; 