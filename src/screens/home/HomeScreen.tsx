// src/screens/home/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  getActiveTripId,
} from '@/services/locationTask';
import { BackgroundPermissionPrompt } from '@/permissions/BackgroundPermissionPrompt';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

interface TripSummary {
  id: string;
  name: string;
  status: string;
}

type BgPermStatus = 'checking' | 'granted' | 'denied' | 'undetermined';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<HomeNavProp>();
  const { colors } = useTheme();
  const [isStarting, setIsStarting] = useState(false);
  const [activeTrips, setActiveTrips] = useState<TripSummary[]>([]);
  const [bgPermStatus, setBgPermStatus] = useState<BgPermStatus>('checking');
  const styles = makeStyles(colors);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadActive() {
        try {
          const res = await api.get<{ trips: TripSummary[] }>('/api/mobile/trips');
          if (mounted) {
            const trips = res.data.trips.filter(t => t.status === 'active');
            setActiveTrips(trips);

            const storedId = await getActiveTripId();
            if (storedId && !trips.find(t => t.id === storedId)) {
              await stopBackgroundTracking();
            }
          }
        } catch (err: any) {
          if (err?.response?.status === 401) return;
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

  async function handleStart() {
    setIsStarting(true);
    try {
      const response = await api.post<{
        trip: { id: string; name: string; status: string; createdAt: string };
        member: { id: string; isLeader: boolean };
      }>('/api/mobile/trips/start', {});
      const tripId = response.data.trip.id;

      try {
        await startBackgroundTracking(tripId);
      } catch (bgErr: any) {
        console.log('[home] bg tracking start failed (foreground-only):', bgErr?.message ?? bgErr);
      }

      navigation.navigate('MapScreen', { tripId });
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      Alert.alert(
        'Could not start trip', // TODO(thai)
        'Please check your connection and try again.', // TODO(thai)
      );
    } finally {
      setIsStarting(false);
    }
  }

  function handleResume() {
    if (activeTrips.length === 1) {
      navigation.navigate('MapScreen', { tripId: activeTrips[0].id });
    } else {
      (navigation.getParent() as any)?.navigate('Trips');
    }
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

      <View style={styles.card}>
        {hasActive ? (
          <>
            {activeTrips.length === 1 && (
              <TouchableOpacity
                style={styles.detailChevron}
                onPress={() => navigation.navigate('TripDetail', { tripId: activeTrips[0].id })}
              >
                <Text style={styles.chevronText}>›</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.cardTitle}>
              {activeTrips.length === 1
                ? 'Trip in progress' // TODO(thai)
                : `${activeTrips.length} active trips` // TODO(thai)
              }
            </Text>
            <Text style={styles.cardBody}>
              {activeTrips.length === 1
                ? activeTrips[0].name
                : 'Tap Resume to continue one of your active trips.' // TODO(thai)
              }
            </Text>
            <Button
              label="Resume Trip" // TODO(thai)
              onPress={handleResume}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label="Start New Trip" // TODO(thai)
              variant="secondary"
              onPress={handleStart}
              loading={isStarting}
              disabled={isStarting}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>No active trip{/* TODO(thai) */}</Text>
            <Text style={styles.cardBody}>
              Tap &quot;Start New Trip&quot; to begin tracking your location.
              {/* TODO(thai) */}
            </Text>
            <Button
              label="Start New Trip" // TODO(thai)
              onPress={handleStart}
              loading={isStarting}
              disabled={isStarting}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}
      </View>

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
    detailChevron: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      padding: spacing.xs,
    },
    chevronText: {
      fontSize: 24,
      color: c.textSecondary,
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
