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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [confirmMasterKey, setConfirmMasterKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async() => {
    if (!email.trim() || !password.trim() || !masterKey.trim()) {
      Alert.alert('Missing details', 'Please fill in every field to register.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your account password.');
      return;
    }

    if (masterKey !== confirmMasterKey) {
      Alert.alert('Master keys do not match', 'Please re-enter your vault master key.');
      return;
    }

    try {
      setLoading(true);
      await register({
        email: email.trim().toLowerCase(),
        password,
        masterKey,
      });
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert(
        'Registration failed',
        error instanceof Error ? error.message : 'Unable to create the account right now.',
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
          <Text style={styles.kicker}>Create account</Text>
          <Text style={styles.title}>Set up your vault.</Text>
          <Text style={styles.subtitle}>
            Your login stays on MongoDB. Your vault items stay encrypted in Realm and can sync
            only as ciphertext.
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
            placeholder="Create account password"
            secureTextEntry
            value={password}
          />
          <Field
            label="Confirm password"
            onChangeText={setConfirmPassword}
            placeholder="Repeat account password"
            secureTextEntry
            value={confirmPassword}
          />
          <Field
            label="Master key"
            hint="This key unlocks encrypted credentials locally and after sync. It is not stored in plaintext."
            onChangeText={setMasterKey}
            placeholder="Create a master key"
            secureTextEntry
            value={masterKey}
          />
          <Field
            label="Confirm master key"
            onChangeText={setConfirmMasterKey}
            placeholder="Repeat the master key"
            secureTextEntry
            value={confirmMasterKey}
          />

          <ActionButton disabled={loading} onPress={handleRegister} title="Create account" />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered?</Text>
            <Text onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
              Log in
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

