import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { Ionicons } from '@expo/vector-icons';

// Importar pantallas (las crearemos después)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MapScreen from '../screens/main/MapScreen';
import MissionsScreen from '../screens/main/MissionsScreen';
import JournalScreen from '../screens/main/JournalScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Missions':
              iconName = focused ? 'flag' : 'flag-outline';
              break;
            case 'Journal':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60
        },
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
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
        options={{
          title: 'Diario'
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
  const { token } = useSelector((state: RootState) => state.auth);
  console.log('Token:', token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 