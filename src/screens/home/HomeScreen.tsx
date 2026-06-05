// src/screens/home/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ActiveTripCard } from '@/components/ActiveTripCard';
import { useAuth } from '@/auth/AuthContext';
import { listTrips, type TripSummary } from '@/api/client';
import {
  stopBackgroundTracking,
  getActiveTripId,
} from '@/services/locationTask';
import { BackgroundPermissionPrompt } from '@/permissions/BackgroundPermissionPrompt';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

type BgPermStatus = 'checking' | 'granted' | 'denied' | 'undetermined';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<HomeNavProp>();
  const { colors } = useTheme();
  const [activeTrips, setActiveTrips] = useState<TripSummary[]>([]);
  const [bgPermStatus, setBgPermStatus] = useState<BgPermStatus>('checking');
  const styles = makeStyles(colors);

  // Refetch active trips every time the screen comes into focus (handles
  // back-from-MapScreen, Stop Trip → Home, etc.).
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadActive() {
        try {
          const all = await listTrips();
          if (mounted) {
            const trips = all.filter((t) => t.status === 'active');
            setActiveTrips(trips);

            // Stale-tracking cleanup: if the background task points at a trip
            // that's no longer active, tear it down.
            const storedId = await getActiveTripId();
            if (storedId && !trips.find((t) => t.id === storedId)) {
              await stopBackgroundTracking();
            }
          }
        } catch (err: any) {
          if (err?.response?.status === 401) return;
          if (mounted) setActiveTrips([]); // defensive — empty, never null
        }

        if (!mounted) return;
        try {
          const { status: fg } = await Location.getForegroundPermissionsAsync();
          if (fg === 'granted') {
            const { status: bg } = await Location.getBackgroundPermissionsAsync();
            if (mounted) {
              setBgPermStatus(
                bg === 'granted'      ? 'granted'      :
                bg === 'undetermined' ? 'undetermined' : 'denied',
              );
            }
          } else {
            if (mounted) setBgPermStatus('checking');
          }
        } catch {
          if (mounted) setBgPermStatus('checking');
        }
      }

      loadActive();
      return () => { mounted = false; };
    }, []),
  );

  function handleStartNewTrip() {
    navigation.navigate('CreateTrip');
  }

  function handleBgGranted() {
    setBgPermStatus('granted');
  }

  const hasActive = activeTrips.length > 0;
  const showBgPrompt = bgPermStatus === 'undetermined' || bgPermStatus === 'denied';

  return (
    <Screen padded background="alt">
      <Text style={styles.greeting}>
        {'Hello, '}{user?.displayName ?? ''}{/* TODO(thai) */}
      </Text>
      <Text style={styles.subtitle}>
        Ready for a trip today?{/* TODO(thai) */}
      </Text>

      {hasActive ? (
        <>
          {/* One card per active trip — each opens its own MapScreen (Phase 6.2.5) */}
          {activeTrips.map((trip) => (
            <ActiveTripCard
              key={trip.id}
              tripId={String(trip.id)}
              name={trip.name}
              memberCount={trip.memberCount}
              onPress={() => navigation.navigate('MapScreen', { tripId: String(trip.id) })}
            />
          ))}
          <Button
            label="Start New Trip" // TODO(thai)
            variant="secondary"
            onPress={handleStartNewTrip}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No active trip{/* TODO(thai) */}</Text>
          <Text style={styles.cardBody}>
            Tap &quot;Start New Trip&quot; to begin tracking your location.
            {/* TODO(thai) */}
          </Text>
          <Button
            label="Start New Trip" // TODO(thai)
            onPress={handleStartNewTrip}
            fullWidth
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}

      {showBgPrompt && (
        <BackgroundPermissionPrompt
          status={bgPermStatus as 'undetermined' | 'denied'}
          onGranted={handleBgGranted}
        />
      )}
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    greeting: {
      ...typography.h2,
      color: c.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: {
      ...typography.h3,
      color: c.textPrimary,
    },
    cardBody: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: spacing.sm,
    },
  });
}
