import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VaultCredential } from '../types/vault';

type Props = {
  item: VaultCredential;
  onReveal: (item: VaultCredential) => void;
  onSync: (item: VaultCredential) => void;
  onEdit: (item: VaultCredential) => void;
  onDelete: (item: VaultCredential) => void;
};

export function CredentialCard({ item, onReveal, onSync, onEdit, onDelete }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.leftBlock}>
          <Text style={styles.service}>{item.serviceLabel}</Text>
          <Text style={styles.subtle}>
            {item.synced
              ? 'Synced to MongoDB'
              : item.syncToBackend
                ? 'Stored locally, ready to sync'
                : 'Stored locally in Realm'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onReveal(item)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.icon}>👁</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSync(item)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.icon}>⇪</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onEdit(item)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.icon}>✎</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onDelete(item)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.icon}>🗑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0C1624',
    borderColor: '#233247',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftBlock: {
    flex: 1,
    paddingRight: 12,
  },
  service: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 5,
  },
  subtle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#101B2B',
    borderColor: '#233247',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    color: '#DBEAFE',
    fontSize: 18,
    fontWeight: '800',
  },
});
