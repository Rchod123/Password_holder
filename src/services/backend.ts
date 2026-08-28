import { Platform } from 'react-native';

import type {
  AuthSession,
  EncryptedPayload,
  RemoteVaultCredential,
  VaultProfile,
} from '../types/vault';

const DEFAULT_API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

const API_BASE_URL =
  (globalThis as { __PASSWORD_HOLDER_API_URL?: string })
    .__PASSWORD_HOLDER_API_URL ?? DEFAULT_API_BASE_URL ?? 'http://localhost:3000/api';

const REQUEST_TIMEOUT_MS = 15_000;

type RequestOptions = RequestInit & {
  token?: string;
};

type AuthResponse = {
  session: AuthSession;
  profile: VaultProfile;
};

type RegisterPayload = {
  email: string;
  password: string;
  masterKey: string;
  vaultSalt: string;
  vaultCheck: EncryptedPayload;
};

type LoginPayload = {
  email: string;
  password: string;
};

type VaultSyncPayload = {
  localId: string;
  serviceLabel?: string;
  encryptedPayload: EncryptedPayload;
  syncedAt?: string;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    const text = await response.text();
    let body: unknown = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
    }

    if (!response.ok) {
      const message =
        (body as { message?: string } | null)?.message ??
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return body as T;
  } catch (error) {
    const errorName =
      typeof error === 'object' && error && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';

    if (errorName === 'AbortError') {
      throw new Error(
        `Backend request timed out. Check that your API is reachable at ${API_BASE_URL}.`,
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the backend at ${API_BASE_URL}. Start the API server or update the API URL.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerUser(payload: RegisterPayload) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRemoteVault(token: string) {
  return request<{ items: RemoteVaultCredential[] }>('/vault', {
    method: 'GET',
    token,
  });
}

export async function syncVaultItem(token: string, payload: VaultSyncPayload) {
  return request<{ item: RemoteVaultCredential }>('/vault', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteVaultItem(token: string, remoteId: string) {
  return request<{ ok: true }>(`/vault/${encodeURIComponent(remoteId)}`, {
    method: 'DELETE',
    token,
  });
}

export async function syncVaultItems(token: string, payloads: VaultSyncPayload[]) {
  return request<{ items: RemoteVaultCredential[] }>('/vault/bulk-sync', {
    method: 'POST',
    token,
    body: JSON.stringify({ items: payloads }),
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
