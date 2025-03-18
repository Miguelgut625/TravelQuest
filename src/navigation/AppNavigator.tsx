import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { Text } from 'react-native';
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

// Función de fallback para iconos
const getFallbackIcon = (routeName: string) => {
  switch (routeName) {
    case 'Map':
      return '🗺️';
    case 'Missions':
      return '🏆';
    case 'Journal':
      return '📔';
    case 'Profile':
      return '👤';
    default:
      return '❓';
  }
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          try {
            switch (route.name) {
              case 'Map':
                iconName = focused ? 'map' : 'map-outline';
                break;
              case 'Missions':
                iconName = focused ? 'trophy' : 'trophy-outline';
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

            return Ionicons ? (
              <Ionicons name={iconName as any} size={size} color={color} />
            ) : (
              <Text style={{ fontSize: size, color }}>{getFallbackIcon(route.name)}</Text>
            );
          } catch (error) {
            return <Text style={{ fontSize: size, color }}>{getFallbackIcon(route.name)}</Text>;
          }
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
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