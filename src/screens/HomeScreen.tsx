import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CredentialCard } from '../components/CredentialCard';
import { Field } from '../components/Field';
import { ModalCard } from '../components/ModalCard';
import { useAuth } from '../context/AuthContext';
import {
  fetchRemoteVault,
  deleteVaultItem,
  syncVaultItem,
} from '../services/backend';
import {
  listVaultCredentials,
  deleteVaultCredential,
  markVaultCredentialSynced,
  saveVaultCredential,
} from '../services/realm';
import type {
  EncryptedPayload,
  VaultCredential,
  VaultPayload,
  VaultCredentialInput,
} from '../types/vault';
import {
  decryptPayloadWithKey,
  encryptPayloadWithKey,
  vaultKeyFromBase64,
  vaultKeyToBase64,
  verifyMasterKey,
} from '../utils/crypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

const GENERIC_REMOTE_LABEL = 'Synced credential';

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseEncryptedPayload(value: string): EncryptedPayload {
  return JSON.parse(value) as EncryptedPayload;
}

export default function HomeScreen() {
  const { session, profile, logout } = useAuth();
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remoteMessage, setRemoteMessage] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<string>('');
  const [vaultKeyBase64, setVaultKeyBase64] = useState<string | null>(null);
  const vaultKeyRef = useRef<ReturnType<typeof vaultKeyFromBase64> | null>(
    null,
  );
  const [unlockVisible, setUnlockVisible] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockAttemptsRemaining, setUnlockAttemptsRemaining] = useState(3);
  const [pendingAction, setPendingAction] = useState<
    | { kind: 'reveal'; credential: VaultCredential }
    | { kind: 'edit'; credential: VaultCredential }
    | { kind: 'save'; draft: VaultCredentialInput }
    | null
  >(null);
  const [addVisible, setAddVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingCredential, setEditingCredential] =
    useState<VaultCredential | null>(null);
  const [draftService, setDraftService] = useState('');
  const [draftUsername, setDraftUsername] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [draftSync, setDraftSync] = useState(false);
  const [revealVisible, setRevealVisible] = useState(false);
  const [revealedCredential, setRevealedCredential] = useState<
    (VaultPayload & { serviceLabel: string }) | null
  >(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isVaultUnlocked = Boolean(vaultKeyBase64);

  const vaultKey = useMemo(() => {
    if (!vaultKeyBase64) {
      return null;
    }

    return vaultKeyFromBase64(vaultKeyBase64);
  }, [vaultKeyBase64]);

  useEffect(() => {
    vaultKeyRef.current = vaultKey;
  }, [vaultKey]);

  const getActiveVaultKey = () => {
    return vaultKeyRef.current ?? vaultKey;
  };

  const hydrateLabelCache = async (nextVaultKeyBase64: string) => {
    const nextVaultKey = vaultKeyFromBase64(nextVaultKeyBase64);
    const items = await listVaultCredentials();
    let changed = false;

    for (const item of items) {
      if (item.serviceLabel !== GENERIC_REMOTE_LABEL) {
        continue;
      }

      try {
        const decrypted = decryptPayloadWithKey<VaultPayload>(
          nextVaultKey,
          parseEncryptedPayload(item.encryptedPayloadJson),
        );
        changed = true;
        await saveVaultCredential({
          ...item,
          serviceLabel: decrypted.serviceLabel,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Ignore records that cannot be decrypted yet.
      }
    }

    if (changed) {
      await reloadCredentials();
    }
  };

  const reloadCredentials = useCallback(async () => {
    const items = await listVaultCredentials();
    setCredentials(items);
  }, []);

  const refreshFromRemote = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      setRemoteMessage('Refreshing encrypted items from MongoDB...');
      const response = await fetchRemoteVault(session.token);

      for (const remoteItem of response.items) {
        await saveVaultCredential({
          id: remoteItem.localId ?? remoteItem.id,
          serviceLabel: GENERIC_REMOTE_LABEL,
          encryptedPayloadJson: JSON.stringify(remoteItem.encryptedPayload),
          synced: true,
          syncToBackend: true,
          remoteId: remoteItem.id,
          createdAt: remoteItem.syncedAt ?? new Date().toISOString(),
          updatedAt:
            remoteItem.updatedAt ??
            remoteItem.syncedAt ??
            new Date().toISOString(),
        });
      }

      await reloadCredentials();
      setRemoteMessage(
        response.items.length
          ? 'Encrypted items synced from MongoDB.'
          : 'No remote items found yet.',
      );
    } catch (error) {
      setRemoteMessage(
        error instanceof Error
          ? error.message
          : 'Remote sync is unavailable right now.',
      );
    }
  }, [reloadCredentials, session]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      await reloadCredentials();
    } finally {
      setLoading(false);
    }
  }, [reloadCredentials]);

  useEffect(() => {
    bootstrap().catch(() => {
      setLoading(false);
    });
  }, [bootstrap]);

  const unlockVault = async (
    master: string,
  ): Promise<ReturnType<typeof vaultKeyFromBase64>> => {
    if (!profile) {
      throw new Error('Vault profile is missing.');
    }

    const unlocked = verifyMasterKey(
      master,
      profile.vaultSalt,
      profile.vaultCheck,
    );
    const unlockedBase64 = vaultKeyToBase64(unlocked);
    vaultKeyRef.current = unlocked;
    setVaultKeyBase64(unlockedBase64);
    await hydrateLabelCache(unlockedBase64);
    return unlocked;
  };

  const closeUnlockModal = () => {
    setUnlockVisible(false);
    setUnlockInput('');
    setUnlockError(null);
    setUnlockAttemptsRemaining(3);
  };

  const requestUnlock = (
    action:
      | { kind: 'reveal'; credential: VaultCredential }
      | { kind: 'edit'; credential: VaultCredential }
      | { kind: 'save'; draft: VaultCredentialInput },
  ) => {
    setPendingAction(action);
    setUnlockVisible(true);
    setUnlockError(null);
    setUnlockAttemptsRemaining(3);
  };

  const handleUnlockSubmit = async () => {
    if (!unlockInput.trim()) {
      setUnlockError('Enter your master key.');
      return;
    }

    try {
      const unlockedKey = await unlockVault(unlockInput.trim());
      const action = pendingAction;
      closeUnlockModal();

      if (action?.kind === 'reveal') {
        await revealCredentialWithKey(action.credential, unlockedKey);
      }

      if (action?.kind === 'edit') {
        await openEditCredentialWithKey(action.credential, unlockedKey);
      }

      if (action?.kind === 'save') {
        await saveDraftCredentialWithKey(action.draft, unlockedKey);
      }

      setPendingAction(null);
      setUnlockInput('');
    } catch (error) {
      const nextAttempts = Math.max(unlockAttemptsRemaining - 1, 0);

      if (nextAttempts <= 0) {
        Alert.alert(
          'Too many attempts',
          'Please try again and enter the correct master key.',
        );
        closeUnlockModal();
        setPendingAction(null);
        return;
      }

      setUnlockAttemptsRemaining(nextAttempts);
      setUnlockError(
        error instanceof Error
          ? `${error.message} ${nextAttempts} attempt(s) left.`
          : `Master key verification failed. ${nextAttempts} attempt(s) left.`,
      );
    }
  };

  const revealCredentialWithKey = async (
    item: VaultCredential,
    activeVaultKey: ReturnType<typeof vaultKeyFromBase64>,
  ) => {
    try {
      const decrypted = decryptPayloadWithKey<VaultPayload>(
        activeVaultKey,
        parseEncryptedPayload(item.encryptedPayloadJson),
      );
      setRevealedCredential(decrypted);
      setRevealVisible(true);
    } catch (error) {
      Alert.alert(
        'Unable to reveal',
        error instanceof Error
          ? error.message
          : 'Could not decrypt this credential.',
      );
    }
  };

  const revealCredential = async (item: VaultCredential) => {
    requestUnlock({ kind: 'reveal', credential: item });
  };

  const openCreateCredentialForm = () => {
    setPendingAction(null);
    setEditorMode('create');
    setEditingCredential(null);
    setDraftService('');
    setDraftUsername('');
    setDraftPassword('');
    setDraftSync(false);
    setAddVisible(true);
  };

  const openEditCredentialWithKey = async (
    item: VaultCredential,
    activeVaultKey: ReturnType<typeof vaultKeyFromBase64>,
  ) => {
    try {
      const decrypted = decryptPayloadWithKey<VaultPayload>(
        activeVaultKey,
        parseEncryptedPayload(item.encryptedPayloadJson),
      );

      setEditorMode('edit');
      setEditingCredential(item);
      setDraftService(decrypted.serviceLabel);
      setDraftUsername(decrypted.username);
      setDraftPassword(decrypted.password);
      setDraftSync(item.syncToBackend);
      setAddVisible(true);
    } catch (error) {
      Alert.alert(
        'Unable to edit',
        error instanceof Error
          ? error.message
          : 'Could not decrypt this credential.',
      );
    }
  };

  const editCredential = async (item: VaultCredential) => {
    const activeVaultKey = getActiveVaultKey();

    if (!activeVaultKey) {
      requestUnlock({ kind: 'edit', credential: item });
      return;
    }

    await openEditCredentialWithKey(item, activeVaultKey);
  };

  const syncCredential = async (item: VaultCredential) => {
    if (!session) {
      Alert.alert('Log in required', 'Please log in again before syncing.');
      return;
    }

    try {
      const encryptedPayload = parseEncryptedPayload(item.encryptedPayloadJson);
      const response = await syncVaultItem(session.token, {
        localId: item.id,
        encryptedPayload,
        syncedAt: new Date().toISOString(),
      });

      await markVaultCredentialSynced(item.id, response.item.id);
      await reloadCredentials();
      setRemoteMessage('Credential uploaded to MongoDB.');
    } catch (error) {
      Alert.alert(
        'Sync failed',
        error instanceof Error
          ? error.message
          : 'Could not upload this credential.',
      );
    }
  };

  const deleteCredentialLocally = async (item: VaultCredential) => {
    await deleteVaultCredential(item.id);
    await reloadCredentials();

    if (editingCredential?.id === item.id) {
      setAddVisible(false);
      setEditingCredential(null);
      setEditorMode('create');
    }
  };

  const deleteAllCredentials = async () => {
    credentials.map(deleteCredentialLocally)
  }

  const deleteCredential = async (item: VaultCredential) => {
    const shouldOfferCloudDelete = Boolean(
      item.synced || item.syncToBackend || item.remoteId,
    );

    const deleteFromCloud = async () => {
      if (!session) {
        Alert.alert(
          'Log in required',
          'Please log in again before deleting from cloud.',
        );
        return;
      }

      try {
        await deleteVaultItem(session.token, item.remoteId ?? item.id);
        await deleteCredentialLocally(item);
        setRemoteMessage('Credential deleted from device and cloud.');
      } catch (error) {
        Alert.alert(
          'Delete failed',
          error instanceof Error
            ? error.message
            : 'Could not delete this credential.',
        );
      }
    };

    const deleteFromDevice = async () => {
      try {
        await deleteCredentialLocally(item);
        setRemoteMessage('Credential deleted from this device.');
      } catch (error) {
        Alert.alert(
          'Delete failed',
          error instanceof Error
            ? error.message
            : 'Could not delete this credential.',
        );
      }
    };

    if (shouldOfferCloudDelete && session) {
      Alert.alert(
        'Delete credential',
        'Do you want to delete it only from this device, or from the cloud too?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Device only',
            style: 'destructive',
            onPress: deleteFromDevice,
          },
          {
            text: 'Device + cloud',
            style: 'destructive',
            onPress: deleteFromCloud,
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Delete credential',
      'Delete this credential from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteFromDevice },
      ],
    );
  };

  const saveDraftCredentialWithKey = async (
    draft: VaultCredentialInput,
    activeVaultKey: ReturnType<typeof vaultKeyFromBase64>,
    existingCredential?: VaultCredential | null,
  ) => {
    if (
      !draft.serviceLabel.trim() ||
      !draft.username.trim() ||
      !draft.password.trim()
    ) {
      Alert.alert(
        'Missing details',
        'Fill in the service, username, and password.',
      );
      return;
    }

    try {
      const now = new Date().toISOString();
      const payload = encryptPayloadWithKey(activeVaultKey, {
        serviceLabel: draft.serviceLabel.trim(),
        username: draft.username.trim(),
        password: draft.password,
      });

      const localCredential: VaultCredential = {
        id: existingCredential?.id ?? createId(),
        serviceLabel: draft.serviceLabel.trim(),
        encryptedPayloadJson: JSON.stringify(payload),
        synced: existingCredential?.synced ?? false,
        syncToBackend: draft.syncToBackend,
        remoteId: existingCredential?.remoteId,
        createdAt: existingCredential?.createdAt ?? now,
        updatedAt: now,
      };

      await saveVaultCredential(localCredential);
      await reloadCredentials();
      setAddVisible(false);
      setEditingCredential(null);
      setEditorMode('create');
      setDraftService('');
      setDraftUsername('');
      setDraftPassword('');
      setDraftSync(false);

      if (draft.syncToBackend && session) {
        await syncCredential(localCredential);
      }
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error
          ? error.message
          : 'Credential could not be stored.',
      );
    }
  };

  const handleSaveCredential = async () => {
    if (!profile) {
      throw new Error('Vault profile is missing.');
    }
    const draft: VaultCredentialInput = {
      serviceLabel: draftService,
      username: draftUsername,
      password: draftPassword,
      syncToBackend: draftSync,
    };
    const unlocked = verifyMasterKey(
      masterKey,
      profile.vaultSalt,
      profile.vaultCheck,
    );

    if (!unlocked) {
      requestUnlock({ kind: 'save', draft });
      return;
    }

    await saveDraftCredentialWithKey(
      draft,
      unlocked,
      editorMode === 'edit' ? editingCredential : null,
    );
  };

  const summary = useMemo(
    () => ({
      total: credentials.length,
      synced: credentials.filter(item => item.synced).length,
      local: credentials.filter(item => !item.synced).length,
    }),
    [credentials],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={async () => {
                setRefreshing(true);
                await bootstrap();
                setRefreshing(false);
              }}
              refreshing={refreshing}
            />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Vault</Text>
              <Text style={styles.title}>Your passwords, locked tight.</Text>
              <Text style={styles.subtitle}>
                Stored in Realm first. Synced to MongoDB only as encrypted
                payloads when you choose.
              </Text>
            </View>

            <View style={styles.headerActions}>
              <ActionButton
                onPress={openCreateCredentialForm}
                title="Add credential"
              />
              <ActionButton
                onPress={refreshFromRemote}
                title="Refresh cloud"
                variant="secondary"
              />
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Saved items</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.synced}</Text>
              <Text style={styles.summaryLabel}>Synced</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.local}</Text>
              <Text style={styles.summaryLabel}>Local only</Text>
            </View>
          </View>

          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>
              {isVaultUnlocked
                ? 'Vault unlocked for this session.'
                : 'Vault locked.'}
            </Text>
            <Text style={styles.bannerText}>
              {isVaultUnlocked
                ? 'You can reveal existing entries and save new ones without entering the master key again.'
                : 'Tap the eye icon on any item, or save a new credential, and we will ask for your master key first.'}
            </Text>
            {remoteMessage ? (
              <Text style={styles.bannerText}>{remoteMessage}</Text>
            ) : null}
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Saved credentials</Text>
            <Text style={styles.sectionMeta}>
              {loading ? 'Loading...' : `${credentials.length} item(s)`}
            </Text>
          </View>

          {credentials.length ? (
            credentials.map(item => (
              <CredentialCard
                key={item.id}
                item={item}
                onReveal={revealCredential}
                onSync={syncCredential}
                onEdit={editCredential}
                onDelete={deleteCredential}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No credentials yet</Text>
              <Text style={styles.emptyText}>
                Add your first entry to store it locally in Realm and optionally
                sync it to MongoDB.
              </Text>
            </View>
          )}

          <ActionButton
            onPress={() => {
              setPendingAction(null);
              openCreateCredentialForm();
            }}
            style={styles.fullWidthButton}
            title="Save a new credential"
            variant="secondary"
          />

          <View style={styles.footerRow}>
            <ActionButton
              onPress={async () => {
                await logout();
                await deleteAllCredentials();
                navigation.reset({
                  index:0,
                  routes: [
                    {
                      name: 'Login'
                    }
                  ]
                })
              }}
              title="Log out"
              variant="ghost"
            />
          </View>
        </ScrollView>

        <ModalCard
          onClose={() => {
            setAddVisible(false);
            setEditingCredential(null);
            setEditorMode('create');
            setDraftService('');
            setDraftUsername('');
            setDraftPassword('');
            setDraftSync(false);
          }}
          subtitle={
            editorMode === 'edit'
              ? 'Update the saved username and password. Cloud sync only happens if you leave it turned on.'
              : 'Store a new username and password in Realm. Choose whether the encrypted payload should sync to MongoDB.'
          }
          title={editorMode === 'edit' ? 'Edit credential' : 'Add credential'}
          visible={addVisible}
        >
          <Field
            label="Service"
            onChangeText={setDraftService}
            placeholder="GitHub, Gmail, bank app..."
            value={draftService}
          />
          <Field
            autoCapitalize="none"
            label="Username"
            onChangeText={setDraftUsername}
            placeholder="Account username or email"
            value={draftUsername}
          />
          <Field
            label="Password"
            onChangeText={setDraftPassword}
            placeholder="Account password"
            secureTextEntry
            value={draftPassword}
          />
          <Field
            label="Master Key"
            onChangeText={setMasterKey}
            placeholder="Master Key"
            secureTextEntry
            value={masterKey}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sync to MongoDB</Text>
            <Text
              onPress={() => setDraftSync(current => !current)}
              style={[
                styles.toggleChip,
                draftSync ? styles.toggleOn : styles.toggleOff,
              ]}
            >
              {draftSync ? 'Yes' : 'No'}
            </Text>
          </View>

          <ActionButton
            onPress={handleSaveCredential}
            title={
              editorMode === 'edit' ? 'Update credential' : 'Save credential'
            }
          />
        </ModalCard>

        <ModalCard
          onClose={() => {
            closeUnlockModal();
            setPendingAction(null);
          }}
          subtitle="Enter the master key for this vault. A wrong key will fail verification."
          title="Unlock vault"
          visible={unlockVisible}
        >
          <Field
            label="Master key"
            onChangeText={text => {
              setUnlockInput(text);
              setUnlockError(null);
            }}
            placeholder="Enter your master key"
            secureTextEntry
            value={unlockInput}
          />
          <Text style={styles.unlockHint}>
            {`${unlockAttemptsRemaining} attempt(s) remaining.`}
          </Text>
          {unlockError ? (
            <Text style={styles.errorText}>{unlockError}</Text>
          ) : null}
          <ActionButton onPress={handleUnlockSubmit} title="Verify key" />
        </ModalCard>

        <ModalCard
          onClose={() => {
            setRevealVisible(false);
            setRevealedCredential(null);
          }}
          subtitle="The values below are decrypted in memory after the master key check passes."
          title="Credential details"
          visible={revealVisible}
        >
          {revealedCredential ? (
            <View style={styles.revealBlock}>
              <Text style={styles.revealLabel}>Service</Text>
              <Text style={styles.revealValue}>
                {revealedCredential.serviceLabel}
              </Text>
              <Text style={styles.revealLabel}>Username</Text>
              <Text style={styles.revealValue}>
                {revealedCredential.username}
              </Text>
              <Text style={styles.revealLabel}>Password</Text>
              <Text style={styles.revealValue}>
                {revealedCredential.password}
              </Text>
            </View>
          ) : null}
          <ActionButton
            onPress={() => {
              setRevealVisible(false);
              setRevealedCredential(null);
            }}
            title="Close"
            variant="secondary"
          />
        </ModalCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#06101D',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  headerActions: {
    gap: 10,
    marginTop: 18,
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#0B1120',
    borderColor: '#223043',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: '#0B1120',
    borderColor: '#223043',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  bannerText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    borderColor: '#223043',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  fullWidthButton: {
    marginTop: 12,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleChip: {
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  toggleOn: {
    backgroundColor: '#123A72',
    borderColor: '#2563EB',
    color: '#DBEAFE',
  },
  toggleOff: {
    backgroundColor: '#1F2937',
    borderColor: '#334155',
    color: '#CBD5E1',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    marginBottom: 12,
  },
  revealBlock: {
    marginBottom: 16,
  },
  revealLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  revealValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  unlockHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
    marginTop: 8,
  },
});
