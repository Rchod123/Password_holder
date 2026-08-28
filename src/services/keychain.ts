import * as Keychain from 'react-native-keychain';

import type { AuthSession, VaultProfile } from '../types/vault';

const SESSION_SERVICE = 'com.passwordholder.session';
const PROFILE_SERVICE = 'com.passwordholder.profile';

function serialize(value: unknown) {
  return JSON.stringify(value);
}

function deserialize<T>(value?: string | null): T | null {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as T;
}

async function saveJson(service: string, value: unknown) {
  await Keychain.setGenericPassword('passwordholder', serialize(value), {
    service,
  });
}

async function readJson<T>(service: string) {
  const result = await Keychain.getGenericPassword({ service });
  if (!result) {
    return null;
  }

  return deserialize<T>(result.password);
}

export async function saveSession(session: AuthSession) {
  await saveJson(SESSION_SERVICE, session);
}

export async function readSession() {
  return readJson<AuthSession>(SESSION_SERVICE);
}

export async function clearSession() {
  await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
}

export async function saveVaultProfile(profile: VaultProfile) {
  await saveJson(PROFILE_SERVICE, profile);
}

export async function readVaultProfile() {
  return readJson<VaultProfile>(PROFILE_SERVICE);
}

export async function clearVaultProfile() {
  await Keychain.resetGenericPassword({ service: PROFILE_SERVICE });
}

