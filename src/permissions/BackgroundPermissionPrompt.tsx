// src/permissions/BackgroundPermissionPrompt.tsx
// Soft-fail nudge for background location permission.
// Rendered by HomeScreen when foreground is granted but background is not.
// Does NOT block the user — Start Trip works without granting this.

import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';

interface BackgroundPermissionPromptProps {
  status: 'undetermined' | 'denied';
  onGranted: () => void;
}

export function BackgroundPermissionPrompt({
  status,
  onGranted,
}: BackgroundPermissionPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleGrant() {
    setIsRequesting(true);
    try {
      const { status: result } = await Location.requestBackgroundPermissionsAsync();
      if (result === 'granted') {
        onGranted();
      }
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>🟡</Text>
      <View style={styles.textBlock}>
        <Text style={styles.title}>
          Background tracking off{/* TODO(thai) */}
        </Text>
        <Text style={styles.body}>
          Locations pause when app is in background.{/* TODO(thai) */}
        </Text>
      </View>
      <View style={styles.actions}>
        {status === 'undetermined' ? (
          <Button
            label="Enable" // TODO(thai)
            variant="secondary"
            onPress={handleGrant}
            loading={isRequesting}
            disabled={isRequesting}
          />
        ) : (
          <Button
            label="Settings" // TODO(thai)
            variant="ghost"
            onPress={() => Linking.openSettings()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginLeft: spacing.sm,
  },
});
