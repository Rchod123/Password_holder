// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import AuthPinBiometricScreen from './src/screens/AuthPinBiometricScreen';


export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  AuthPinBiometric: undefined;
  Home: { derivedKey: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccountSetup = async () => {
      const hasKey = false; // Mock value
      setIsConfigured(hasKey);
    };
    checkAccountSetup();
  }, []);

  if (isConfigured === null) return null; // Loading splash

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isConfigured ? 'AuthPinBiometric' : 'Register'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AuthPinBiometric" component={AuthPinBiometricScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}