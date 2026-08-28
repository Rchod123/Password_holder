import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

import {
  clearSession,
  clearVaultProfile,
  readSession,
  readVaultProfile,
  saveSession,
  saveVaultProfile,
} from '../services/keychain';
import {
  loginUser,
  registerUser,
} from '../services/backend';
import type { AuthSession, VaultProfile } from '../types/vault';
import { createVaultSalt, createVaultCheck, deriveVaultKey } from '../utils/crypto';

type RegisterInput = {
  email: string;
  password: string;
  masterKey: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  initializing: boolean;
  session: AuthSession | null;
  profile: VaultProfile | null;
  biometricAvailable: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  logout: () => Promise<void>;
  persistProfile: (profile: VaultProfile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<VaultProfile | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const [savedSession, savedProfile] = await Promise.all([
        readSession(),
        readVaultProfile(),
      ]);

      const biometrics = new ReactNativeBiometrics();
      const { available } = await biometrics.isSensorAvailable();

      if (!mounted) {
        return;
      }

      setSession(savedSession);
      setProfile(savedProfile);
      setBiometricAvailable(available);
      setInitializing(false);
    };

    bootstrap().catch(() => {
      if (mounted) {
        setInitializing(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const persistProfile = async (nextProfile: VaultProfile) => {
    await saveVaultProfile(nextProfile);
    setProfile(nextProfile);
  };

  const persistSession = async (
    nextSession: AuthSession,
    nextProfile: VaultProfile,
  ) => {
    await Promise.all([saveSession(nextSession), saveVaultProfile(nextProfile)]);
    setSession(nextSession);
    setProfile(nextProfile);
  };

  const register = async (input: RegisterInput) => {
    const vaultSalt = createVaultSalt();
    const vaultKey = deriveVaultKey(input.masterKey, vaultSalt);
    const vaultCheck = createVaultCheck(vaultKey);
    const response = await registerUser({
      email: input.email,
      password: input.password,
      masterKey: input.masterKey,
      vaultSalt,
      vaultCheck,
    });

    await persistSession(response.session, response.profile);
  };

  const login = async (input: LoginInput) => {
    console.log(input,"from the login")
    const response = await loginUser(input);

    await persistSession(response.session, response.profile);
  };

  const loginWithBiometrics = async () => {
    const biometrics = new ReactNativeBiometrics();
    const { available } = await biometrics.isSensorAvailable();

    if (!available) {
      throw new Error('Biometrics are not available on this device.');
    }

    const result = await biometrics.simplePrompt({
      promptMessage: 'Unlock Password Holder',
    });

    if (!result.success) {
      throw new Error('Biometric authentication was canceled.');
    }

    const [savedSession, savedProfile] = await Promise.all([
      readSession(),
      readVaultProfile(),
    ]);

    if (!savedSession || !savedProfile) {
      throw new Error('No saved login session was found.');
    }

    setSession(savedSession);
    setProfile(savedProfile);
  };

  const logout = async () => {
    await Promise.all([clearSession(), clearVaultProfile()]);
    setSession(null);
    setProfile(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      session,
      profile,
      biometricAvailable,
      register,
      login,
      loginWithBiometrics,
      logout,
      persistProfile,
    }),
    [
      biometricAvailable,
      initializing,
      login,
      loginWithBiometrics,
      logout,
      persistProfile,
      profile,
      register,
      session,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
