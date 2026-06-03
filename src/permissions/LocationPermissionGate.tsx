// src/permissions/LocationPermissionGate.tsx
// Wraps any component requiring foreground location permission.
// States: checking (initial lookup) -> undetermined -> requesting -> granted | denied.
// On denied: shows explanation + "Open Settings" CTA (iOS and Android).

import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme';

type GateStatus = 'checking' | 'undetermined' | 'requesting' | 'granted' | 'denied';

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

export function LocationPermissionGate({ children }: LocationPermissionGateProps) {
  const [gateStatus, setGateStatus] = useState<GateStatus>('checking');

  // Read existing permission state on mount — does not show the OS prompt
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setGateStatus('granted');
      } else if (status === 'undetermined') {
        setGateStatus('undetermined');
      } else {
        // 'denied' or iOS 'restricted'
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
    // Blank while reading stored permission — avoids flicker
    return <Screen padded><View style={styles.center} /></Screen>;
  }

  if (gateStatus === 'undetermined' || gateStatus === 'requesting') {
    return (
      <Screen padded>
        <View style={styles.center}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>
            Location Required{/* TODO(thai): translate after agent finishes */}
          </Text>
          <Text style={styles.body}>
            AiKlao uses your location to track trips in real time while the app is open.
            {/* TODO(thai): translate after agent finishes */}
          </Text>
          <Button
            label="Allow Location" // TODO(thai): translate after agent finishes
            onPress={requestPermission}
            loading={gateStatus === 'requesting'}
            fullWidth
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </Screen>
    );
  }

  // denied or restricted
  return (
    <Screen padded>
      <View style={styles.center}>
        <Text style={styles.emoji}>🚫</Text>
        <Text style={styles.title}>
          Location Permission Denied{/* TODO(thai): translate after agent finishes */}
        </Text>
        <Text style={styles.body}>
          Please enable location access in Settings to use AiKlao trip tracking.
          {/* TODO(thai): translate after agent finishes */}
        </Text>
        <Button
          label="Open Settings" // TODO(thai): translate after agent finishes
          onPress={() => Linking.openSettings()}
          fullWidth
          style={{ marginTop: spacing.xl }}
        />
        <Button
          label="Try Again" // TODO(thai): translate after agent finishes
          variant="ghost"
          onPress={requestPermission}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
