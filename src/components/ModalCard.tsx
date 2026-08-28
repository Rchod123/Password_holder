import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function ModalCard({ visible, title, subtitle, children, onClose }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={() => undefined} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0B1120',
    borderColor: '#223043',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    width: '100%',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
});

