import { Buffer } from 'buffer';
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from 'react-native-quick-crypto';

import type {
  EncryptedPayload,
  VaultPayload,
} from '../types/vault';

const AES_KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_DIGEST = 'sha256';
const AUTH_TAG_LENGTH = 16;

function serializePayload(payload: VaultPayload | { kind: string }) {
  return Buffer.from(JSON.stringify(payload), 'utf8') as any;
}

function deserializePayload(buffer: any) {
  return JSON.parse(buffer.toString('utf8')) as Record<string, unknown>;
}

export function createVaultSalt() {
  return randomBytes(16).toString('base64');
}

export function deriveVaultKey(masterKey: string, vaultSaltBase64: string): any {
  console.log(masterKey,PBKDF2_ITERATIONS,AES_KEY_LENGTH,PBKDF2_DIGEST,vaultSaltBase64,"from the main cheslc");
  return pbkdf2Sync(
    masterKey,
    Buffer.from(vaultSaltBase64, 'base64') as any,
    PBKDF2_ITERATIONS,
    AES_KEY_LENGTH,
    PBKDF2_DIGEST,
  ) as any;
}

export function encryptPayloadWithKey(
  vaultKey: any,
  payload: VaultPayload | { kind: string },
): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', vaultKey as any, iv as any, {
    authTagLength: AUTH_TAG_LENGTH,
  }) as any;
  const ciphertext = Buffer.concat([
    cipher.update(serializePayload(payload)),
    cipher.final(),
  ]) as any;
  const tag = cipher.getAuthTag() as any;

  return {
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptPayloadWithKey<T extends Record<string, unknown>>(
  vaultKey: any,
  payload: EncryptedPayload,
): T {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    vaultKey as any,
    Buffer.from(payload.iv, 'base64') as any,
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  ) as any;

  decipher.setAuthTag(Buffer.from(payload.tag, 'base64') as any);

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64') as any),
    decipher.final(),
  ]) as any;

  return deserializePayload(plaintext) as T;
}

export function createVaultCheck(vaultKey: any) {
  return encryptPayloadWithKey(vaultKey, { kind: 'vault-check' });
}

export function verifyMasterKey(
  masterKey: string,
  vaultSaltBase64: string,
  vaultCheck: EncryptedPayload,
): any {
  const vaultKey = deriveVaultKey(masterKey, vaultSaltBase64);
  const result = decryptPayloadWithKey<{ kind?: string }>(vaultKey, vaultCheck);

  if (result.kind !== 'vault-check') {
    throw new Error('Master key verification failed.');
  }

  return vaultKey;
}

export function vaultKeyToBase64(vaultKey: any) {
  return (vaultKey as any).toString('base64');
}

export function vaultKeyFromBase64(vaultKeyBase64: string) {
  return Buffer.from(vaultKeyBase64, 'base64') as any;
}
