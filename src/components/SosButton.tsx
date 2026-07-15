// src/components/SosButton.tsx
// Phase 6.2 Session B (REV 2) — tap-to-confirm SOS button.
// Confirm Alert.alert is owned by the parent (TripDetailScreen, via the shared
// useSos hook) — this component is a pure stateless Pressable with two visual
// modes (idle / active-sos).
//
// B2-5: this component used to bypass the theme system entirely (5 hardcoded hex
// values, one of them — #DC2626 — copy-pasted in 2 other files too). Now theme-aware;
// as a side effect this is also the first time the SOS button adapts to dark mode.

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme';

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (activeSosId) {
    return (
      <Pressable
        onPress={() => onCancelSos?.(activeSosId)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cancelButton,
          { width: size * 1.8, height: size, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('sos.a11yCancel')}
      >
        <Text style={styles.cancelText}>{t('sos.buttonCancel')}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.sosButton,
        { width: size, height: size, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
      accessibilityRole="button"
      accessibilityLabel={t('sos.a11ySend')}
    >
      <Text style={[styles.sosLabel, { fontSize: size * 0.5 }]}>🚨</Text>
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    sosButton: {
      borderRadius: 999,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: c.white,
      shadowColor: c.black,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 5,
    },
    sosLabel: {
      color: c.white,
      fontWeight: '700',
    },
    cancelButton: {
      borderRadius: 999,
      backgroundColor: c.gray600,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.white,
      shadowColor: c.black,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 3,
    },
    cancelText: {
      color: c.white,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
