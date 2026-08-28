import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AuthPinBiometricScreen from './src/screens/AuthPinBiometricScreen';

export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  AuthPinBiometric: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { initializing, session } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#93C5FD" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={session ? 'authenticated' : 'unauthenticated'}
        initialRouteName={session ? 'AuthPinBiometric' : 'Register'}
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

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#06101D',
    flex: 1,
    justifyContent: 'center',
  },
});

