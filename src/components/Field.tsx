import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type Props = React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#7D8597"
        style={[styles.input, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    color: '#E8EEF7',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#111827',
    borderColor: '#263244',
    borderRadius: 16,
    borderWidth: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hint: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
});

