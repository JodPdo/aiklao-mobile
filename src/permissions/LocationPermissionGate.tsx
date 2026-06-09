// src/permissions/LocationPermissionGate.tsx
// Wraps any component requiring foreground location permission.
// States: checking (initial lookup) -> undetermined -> requesting -> granted | denied.
// On denied: shows explanation + "Open Settings" CTA (iOS and Android).

import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

type GateStatus = 'checking' | 'undetermined' | 'requesting' | 'granted' | 'denied';

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const { colors } = useTheme();
  const [gateStatus, setGateStatus] = useState<GateStatus>('checking');
  const styles = makeStyles(colors);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setGateStatus('granted');
      } else if (status === 'undetermined') {
        setGateStatus('undetermined');
      } else {
        setGateStatus('denied');
      }
    });
  }, []);

  async function requestPermission() {
    setGateStatus('requesting');
    const { status } = await Location.requestForegroundPermissionsAsync();
    setGateStatus(status === 'granted' ? 'granted' : 'denied');
  }

  if (gateStatus === 'granted') {
    return <>{children}</>;
  }

  if (gateStatus === 'checking') {
    return <Screen padded><View style={styles.center} /></Screen>;
  }

  if (gateStatus === 'undetermined' || gateStatus === 'requesting') {
    return (
      <Screen padded>
        <View style={styles.center}>
          <Text style={styles.title}>{t('permission.requiredTitle')}</Text>
          <Text style={styles.body}>
            {t('permission.requiredBody')}
          </Text>
          <Button
            label={t('permission.allow')}
            onPress={requestPermission}
            loading={gateStatus === 'requesting'}
            fullWidth
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <View style={styles.center}>
        <Text style={styles.emoji}>🚫</Text>
        <Text style={styles.title}>{t('permission.deniedTitle')}</Text>
        <Text style={styles.body}>
          {t('permission.deniedBody')}
        </Text>
        <Button
          label={t('permission.openSettings')}
          onPress={() => Linking.openSettings()}
          fullWidth
          style={{ marginTop: spacing.xl }}
        />
        <Button
          label={t('common.retry')}
          variant="ghost"
          onPress={requestPermission}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    emoji: { fontSize: 64, marginBottom: spacing.lg, textAlign: 'center' },
    title: {
      ...typography.h2,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    body: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
