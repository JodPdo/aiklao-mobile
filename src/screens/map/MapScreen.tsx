// src/screens/map/MapScreen.tsx
// Phase 5.2 Session C: permission gate + map render framework.
// Session D: tripId param (backend wiring verified).
// Session E Path 1: Stop button on Path B placeholder.
// Phase 5.3 Session B: REMOVE watchPositionAsync (Pattern A — background task is sole POST
//   trigger). stopBackgroundTracking called on Stop. Tracking status indicator added.

import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LocationPermissionGate } from '@/permissions/LocationPermissionGate';
import { Button } from '@/components/Button';
import { api } from '@/api/client';
import { stopBackgroundTracking } from '@/services/locationTask';
import { colors, spacing, typography } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type MapScreenProps = {
  route: RouteProp<HomeStackParamList, 'MapScreen'>;
};

type MapNavProp = NativeStackNavigationProp<HomeStackParamList, 'MapScreen'>;

export function MapScreen({ route }: MapScreenProps) {
  const { tripId } = route.params;
  const navigation = useNavigation<MapNavProp>();
  const [isStopping, setIsStopping] = useState(false);
  const [bgGranted, setBgGranted] = useState<boolean | null>(null);

  // Check background permission for the tracking status indicator
  useEffect(() => {
    Location.getBackgroundPermissionsAsync()
      .then(({ status }) => setBgGranted(status === 'granted'))
      .catch(() => setBgGranted(false));
  }, []);

  function handleStop() {
    if (isStopping) return; // guard against double-tap before Alert closes
    Alert.alert(
      'Stop trip?', // TODO(thai)
      'This will end tracking and archive the trip.', // TODO(thai)
      [
        { text: 'Cancel', style: 'cancel' }, // TODO(thai)
        {
          text: 'Stop', // TODO(thai)
          style: 'destructive',
          onPress: async () => {
            setIsStopping(true);
            try {
              await api.post(`/api/mobile/trips/${tripId}/stop`);
              // Tear down background task and clear AsyncStorage
              await stopBackgroundTracking();
              navigation.goBack();
            } catch (err: any) {
              setIsStopping(false);
              if (err?.response?.status === 401) return;
              Alert.alert('Could not stop trip', 'Try again.'); // TODO(thai)
            }
          },
        },
      ],
    );
  }

  const trackingLabel =
    bgGranted === null  ? null :
    bgGranted           ? '🟢 Background tracking active' : // TODO(thai)
                          '🟡 Foreground tracking only';    // TODO(thai)

  return (
    <LocationPermissionGate>
      <View style={styles.container}>
        {/* Path B placeholder — replaces MapView until Google Maps key acquired */}
        <View style={styles.placeholder}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>
            Location tracking active{/* TODO(thai) */}
          </Text>
          <Text style={styles.body}>
            Map display requires a Google Maps API key.{'\n'}
            Coming in Session E.1.5.{/* TODO(thai) */}
          </Text>
        </View>

        {/* Floating Stop button — bottom-center */}
        <View style={styles.stopWrapper}>
          <Text style={styles.tripLabel}>Trip #{tripId}</Text>
          {trackingLabel !== null && (
            <Text style={styles.trackingLabel}>{trackingLabel}</Text>
          )}
          <Button
            label="Stop Trip" // TODO(thai)
            variant="danger"
            onPress={handleStop}
            disabled={isStopping}
            loading={isStopping}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </LocationPermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100, // keep content above the floating Stop area
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
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
  stopWrapper: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tripLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  trackingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
