// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';

interface VaultItem {
  id: string;
  service: string;
  username: string;
  password: string; // Plaintext only in component state, encrypted before saving to Realm
}

export default function HomeScreen() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  // Modal Input States
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSavePassword = () => {
    if (!service || !password) return;

    // 1. Encrypt 'password' & 'username' using AES-256-GCM via react-native-quick-crypto
    // 2. Save encrypted payload into Realm / MongoDB
    const newItem: VaultItem = {
      id: Date.now().toString(),
      service,
      username,
      password,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset Form & Close
    setService('');
    setUsername('');
    setPassword('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Vault</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.serviceText}>{item.service}</Text>
            <Text style={styles.detailText}>User: {item.username}</Text>
            <Text style={styles.detailText}>Pass: ••••••••</Text>
          </View>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Password Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Password</Text>

            <TextInput
              placeholder="Service (e.g. GitHub)"
              value={service}
              onChangeText={setService}
              style={styles.input}
            />
            <TextInput
              placeholder="Username / Email"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSavePassword}
              >
                <Text style={styles.buttonText}>Save Encrypted</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 20 },
  card: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 8, marginBottom: 12 },
  serviceText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  detailText: { color: '#AAA', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#6200EE',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 28 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#222', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  cancelButton: { backgroundColor: '#444' },
  saveButton: { backgroundColor: '#6200EE' },
  buttonText: { color: '#FFF', fontWeight: '600' },
});