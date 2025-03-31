import React from 'react'; 
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SecondaryTabsNavigator from './SecondaryTabsNavigator';
import HomeScreen from '../screens/main/HomeScreen';

export type RootStackParams = {
  HomeTabs: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();

const AppNavigator = () => {
  const { token } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeTabs" component={SecondaryTabsNavigator} />
        {!token && (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />

          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
