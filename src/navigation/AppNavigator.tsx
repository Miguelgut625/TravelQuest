import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import MapScreen from '../screens/main/MapScreen';
import MissionsScreen from '../screens/main/MissionsScreen';
import JournalScreen from '../screens/main/JournalScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmailSentScreen from '../screens/auth/EmailSentScreen';
import { useTheme } from 'react-native-paper';

// Definir los tipos para la navegación
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  Main: undefined;
  EmailSent: undefined;
};

type TabParamList = {
  Map: undefined;
  Missions: {
    journeyId: string;
    challenges: any[];
  };
  Journal: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const MainTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          switch (route.name) {
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Missions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Journal':
              iconName = focused ? 'journal' : 'journal-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Mapa',
        }}
      />
      <Tab.Screen
        name="Missions"
        component={MissionsScreen}
        options={{
          title: 'Misiones',
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          title: 'Diario',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, authState } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {authState === 'password_recovery' ? (
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{
              title: 'Recuperar Contraseña',
              headerBackTitle: 'Volver',
              gestureEnabled: false
            }}
          />
        ) : !user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: 'Registro',
                headerBackTitle: 'Volver'
              }}
            />
            <Stack.Screen
              name="EmailSent"
              component={EmailSentScreen}
              options={{
                title: 'Correo Enviado',
                headerBackTitle: 'Volver'
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{
              headerShown: false
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 