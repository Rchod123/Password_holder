import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ActionButton } from '../components/ActionButton';
import { Field } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, biometricAvailable, loginWithBiometrics } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async() => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      console.log(email,password);
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      navigation.navigate('Home')
    } catch (error) {
      Alert.alert(
        'Login failed',
        error instanceof Error ? error.message : 'Unable to log in right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async() => {
    try {
      setLoading(true);
      await loginWithBiometrics();
    } catch (error) {
      Alert.alert(
        'Biometric unlock failed',
        error instanceof Error ? error.message : 'Biometric authentication failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.kicker}>Password Holder</Text>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            Sign in to load your encrypted vault from MongoDB and your local Realm cache.
          </Text>
        </View>

        <View style={styles.panel}>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <Field
            label="Password"
            onChangeText={setPassword}
            placeholder="Account password"
            secureTextEntry
            value={password}
          />

          <ActionButton disabled={loading} onPress={handleLogin} title="Log in" />

          {biometricAvailable ? (
            <View style={styles.secondaryBlock}>
              <ActionButton
                disabled={loading}
                onPress={handleBiometricLogin}
                title="Use biometrics"
                variant="secondary"
              />
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>No account yet?</Text>
            <Text
              onPress={() => navigation.navigate('Register')}
              style={styles.footerLink}
            >
              Create one
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#06101D',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    marginBottom: 24,
  },
  kicker: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: '#0B1120',
    borderColor: '#223043',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  secondaryBlock: {
    marginTop: 12,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  footerLink: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '800',
  },
});

