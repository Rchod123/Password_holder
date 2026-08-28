export type AuthSession = {
  token: string;
  userId: string;
  email: string;
};

export type VaultProfile = {
  userId: string;
  email: string;
  vaultSalt: string;
  vaultCheck: EncryptedPayload;
};

export type VaultPayload = {
  serviceLabel: string;
  username: string;
  password: string;
};

export type EncryptedPayload = {
  iv: string;
  ciphertext: string;
  tag: string;
};

export type VaultCredential = {
  id: string;
  serviceLabel: string;
  encryptedPayloadJson: string;
  synced: boolean;
  syncToBackend: boolean;
  remoteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type VaultCredentialInput = {
  serviceLabel: string;
  username: string;
  password: string;
  syncToBackend: boolean;
};

export type RemoteVaultCredential = {
  id: string;
  localId?: string;
  serviceLabelHint?: string;
  encryptedPayload: EncryptedPayload;
  syncedAt?: string;
  updatedAt?: string;
};

export type UnlockState = {
  masterKey?: string;
  vaultKeyBase64?: string;
};
