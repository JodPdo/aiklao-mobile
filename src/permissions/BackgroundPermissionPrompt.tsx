// src/permissions/BackgroundPermissionPrompt.tsx
// Soft-fail nudge for background location permission.
// Rendered by HomeScreen when foreground is granted but background is not.
// Does NOT block the user — Start Trip works without granting this.

import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

interface BackgroundPermissionPromptProps {
  status: 'undetermined' | 'denied';
  onGranted: () => void;
}

export function BackgroundPermissionPrompt({
  status,
  onGranted,
}: BackgroundPermissionPromptProps) {
  const { colors } = useTheme();
  const [isRequesting, setIsRequesting] = useState(false);
  const styles = makeStyles(colors);

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
        <Text style={styles.title}>{t('home.bgPrompt.title')}</Text>
        <Text style={styles.body}>{t('home.bgPrompt.body')}</Text>
      </View>
      <View style={styles.actions}>
        {status === 'undetermined' ? (
          <Button
            label={t('home.bgPrompt.enable')}
            variant="secondary"
            onPress={handleGrant}
            loading={isRequesting}
            disabled={isRequesting}
          />
        ) : (
          <Button
            label={t('home.bgPrompt.settings')}
            variant="ghost"
            onPress={() => Linking.openSettings()}
          />
        )}
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.warning,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    icon: { fontSize: 20 },
    textBlock: { flex: 1 },
    title: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
    body: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    actions: { marginLeft: spacing.sm },
  });
}
