import Realm from 'realm';

import type { VaultCredential } from '../types/vault';

const VaultCredentialSchema: Realm.ObjectSchema = {
  name: 'VaultCredential',
  primaryKey: 'id',
  properties: {
    id: 'string',
    serviceLabel: 'string',
    encryptedPayloadJson: 'string',
    synced: { type: 'bool', default: false },
    syncToBackend: { type: 'bool', default: false },
    remoteId: 'string?',
    createdAt: 'string',
    updatedAt: 'string',
  },
};

let realmInstance: Promise<Realm> | null = null;

async function openRealm() {
  if (!realmInstance) {
    realmInstance = Realm.open({
      schema: [VaultCredentialSchema],
      schemaVersion: 2,
      migration: (oldRealm, newRealm) => {
        if (oldRealm.schemaVersion < 2) {
          const oldObjects = oldRealm.objects('VaultCredential');
          const newObjects = newRealm.objects('VaultCredential');

          for (let index = 0; index < oldObjects.length; index += 1) {
            if (newObjects[index].syncToBackend === undefined) {
              newObjects[index].syncToBackend = false;
            }
          }
        }
      },
    });
  }

  return realmInstance;
}

function mapRealmObject(item: any): VaultCredential {
  return {
    id: item.id,
    serviceLabel: item.serviceLabel,
    encryptedPayloadJson: item.encryptedPayloadJson,
    synced: item.synced,
    syncToBackend: item.syncToBackend,
    remoteId: item.remoteId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listVaultCredentials() {
  const realm = await openRealm();
  return realm
    .objects('VaultCredential')
    .sorted('createdAt', true)
    .map((item) => mapRealmObject(item));
}

export async function saveVaultCredential(
  credential: VaultCredential,
): Promise<VaultCredential> {
  const realm = await openRealm();

  realm.write(() => {
    realm.create('VaultCredential', credential as any, Realm.UpdateMode.Modified);
  });

  return credential;
}

export async function markVaultCredentialSynced(
  localId: string,
  remoteId: string,
) {
  const realm = await openRealm();
  const credential = realm.objectForPrimaryKey('VaultCredential', localId) as any;

  if (!credential) {
    return null;
  }

  realm.write(() => {
    credential.synced = true;
    credential.remoteId = remoteId;
    credential.updatedAt = new Date().toISOString();
  });

  return mapRealmObject(credential);
}

export async function upsertRemoteVaultCredential(
  credential: VaultCredential,
) {
  const realm = await openRealm();

  realm.write(() => {
    realm.create('VaultCredential', credential as any, Realm.UpdateMode.Modified);
  });

  return credential;
}

export async function replaceAllRemoteVaultCredentials(
  credentials: VaultCredential[],
) {
  const realm = await openRealm();

  realm.write(() => {
    const existing = realm.objects('VaultCredential');
    const remoteIds = new Set(
      credentials.map((credential) => credential.remoteId).filter(Boolean),
    );

    const filtered = existing.filtered(
      'remoteId != nil AND NOT remoteId IN $0',
      Array.from(remoteIds),
    );

    realm.delete(filtered);

    for (const credential of credentials) {
      realm.create('VaultCredential', credential as any, Realm.UpdateMode.Modified);
    }
  });

  return listVaultCredentials();
}

export async function deleteVaultCredential(localId: string) {
  const realm = await openRealm();
  const credential = realm.objectForPrimaryKey('VaultCredential', localId) as any;

  if (!credential) {
    return;
  }

  realm.write(() => {
    realm.delete(credential);
  });
}
