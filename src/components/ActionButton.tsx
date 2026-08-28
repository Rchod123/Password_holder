import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
};

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: '#2563EB',
  },
  secondary: {
    backgroundColor: '#182230',
    borderColor: '#2A374A',
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#991B1B',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: '#F8FAFC',
  },
  secondary: {
    color: '#E2E8F0',
  },
  ghost: {
    color: '#CBD5E1',
  },
  danger: {
    color: '#FFF7ED',
  },
});

