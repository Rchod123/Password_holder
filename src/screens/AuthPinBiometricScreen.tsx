import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ActionButton } from '../components/ActionButton';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthPinBiometric'>;

export default function AuthPinBiometricScreen({ navigation }: Props) {
  const { session, loginWithBiometrics, biometricAvailable, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const unlock = async() => {
      try {
        setLoading(true);
        await loginWithBiometrics();
        navigation.replace('Home');
      } catch {
        setLoading(false);
      }
    };

    if (biometricAvailable) {
      unlock();
    }
  }, [biometricAvailable, loginWithBiometrics, navigation, session]);

  const handleUnlock = async() => {
    try {
      setLoading(true);
      if (biometricAvailable) {
        await loginWithBiometrics();
      }
      navigation.replace('Home');
    } catch (error) {
      Alert.alert(
        'Unlock failed',
        error instanceof Error ? error.message : 'Biometric unlock could not complete.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>No active session</Text>
        <Text style={styles.subtitle}>
          Use login or registration to start using the vault.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton onPress={() => navigation.replace('Login')} title="Log in" />
          <ActionButton
            onPress={() => navigation.replace('Register')}
            title="Register"
            variant="secondary"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Session locked</Text>
      <Text style={styles.title}>Unlock with biometrics.</Text>
      <Text style={styles.subtitle}>
        This gate protects the saved login session before you enter the vault.
      </Text>

      <View style={styles.buttonRow}>
        <ActionButton
          disabled={loading}
          onPress={handleUnlock}
          title={biometricAvailable ? 'Scan to continue' : 'Continue'}
        />
        <ActionButton
          disabled={loading}
          onPress={async() => {
            await logout();
            navigation.replace('Login');
          }}
          title="Log out"
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#06101D',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
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
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 360,
    textAlign: 'center',
  },
  buttonRow: {
    gap: 12,
    width: '100%',
  },
});
