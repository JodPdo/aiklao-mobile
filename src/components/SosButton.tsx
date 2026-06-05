// src/components/SosButton.tsx
// Phase 6.2 Session B (REV 2) — tap-to-confirm SOS button.
// Confirm Alert.alert is owned by the parent (MapScreen) — this component
// is a pure stateless Pressable with two visual modes (idle / active-sos).

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export interface SosButtonProps {
  /** Called when user taps the idle button. Parent shows confirm Alert. */
  onPress: () => void;
  /** Diameter in px (default 40). */
  size?: number;
  disabled?: boolean;
  /** If set, button enters cancel mode. Tap calls onCancelSos(activeSosId). */
  activeSosId?: string | null;
  onCancelSos?: (id: string) => void;
}

export function SosButton({
  onPress, size = 40, disabled = false, activeSosId, onCancelSos,
}: SosButtonProps) {
  if (activeSosId) {
    return (
      <Pressable
        onPress={() => onCancelSos?.(activeSosId)}
        disabled={disabled}
        style={[
          styles.cancelButton,
          { width: size * 1.8, height: size, opacity: disabled ? 0.5 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="ยกเลิก SOS"
      >
        <Text style={styles.cancelText}>❌ ยกเลิก SOS</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.sosButton,
        { width: size, height: size, opacity: disabled ? 0.5 : 1 },
        pressed && styles.sosButtonPressed,
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
      accessibilityRole="button"
      accessibilityLabel="ส่งสัญญาณ SOS"
    >
      <Text style={[styles.sosLabel, { fontSize: size * 0.5 }]}>🚨</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  sosButtonPressed: {
    backgroundColor: '#B91C1C',
  },
  sosLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 999,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 3,
  },
  cancelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
