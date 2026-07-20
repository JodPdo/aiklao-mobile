// src/screens/home/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ActiveTripCard } from '@/components/ActiveTripCard';
import { useAuth } from '@/auth/AuthContext';
import { t } from '@/i18n';
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
  // back-from-TripDetail, Stop Trip → Home, etc.).
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

  // UI-1: content lives inside a ScrollView so any number of active trip cards stays
  // reachable (previously the cards rendered straight into <Screen padded>, so with 3+
  // trips the primary actions fell below the fold on a screen that could not scroll).
  // Screen's own `padded` is turned off and its paddings are re-applied on
  // contentContainerStyle instead — padding on the ScrollView itself would clip the
  // scrollable area rather than inset the content. Same shape as SettingsScreen.tsx:134-139
  // and TripDetailScreen.tsx:329-332. No RefreshControl: Screen provides no pull behavior
  // and this screen refetches via useFocusEffect, so pull-to-refresh would be new behavior.
  return (
    <Screen padded={false} background="alt" style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          {t('home.greeting', { name: user?.displayName ?? '' })}
        </Text>
        <Text style={styles.subtitle}>
          {t('home.subtitle')}
        </Text>

        {/* UI-1 order (both branches): primary action first, then the permission nudge,
            then any trip cards — so Start New Trip and the prompt are always above the
            fold no matter how many trips are active. */}
        {hasActive ? (
          <>
            <Button
              label={t('home.startNewTrip')}
              onPress={handleStartNewTrip}
              fullWidth
            />

            {showBgPrompt && (
              <BackgroundPermissionPrompt
                status={bgPermStatus as 'undetermined' | 'denied'}
                onGranted={handleBgGranted}
              />
            )}

            {/* One card per active trip — each opens its own TripDetail (Phase 6.2.5) */}
            <View style={styles.cards}>
              {activeTrips.map((trip) => (
                <ActiveTripCard
                  key={trip.id}
                  tripId={String(trip.id)}
                  name={trip.name}
                  memberCount={trip.memberCount}
                  onPress={() => navigation.navigate('TripDetail', { tripId: String(trip.id) })}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Empty state unchanged — the button already sits at the top of the card,
                and with no cards to push it down there was never a fold problem here. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('home.noActiveTrip')}</Text>
              <Text style={styles.cardBody}>
                {t('home.noActiveTripBody')}
              </Text>
              <Button
                label={t('home.startNewTrip')}
                onPress={handleStartNewTrip}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />
            </View>

            {showBgPrompt && (
              <BackgroundPermissionPrompt
                status={bgPermStatus as 'undetermined' | 'denied'}
                onGranted={handleBgGranted}
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    // No backgroundColor here — Screen's SafeAreaView already paints `alt`, and setting
    // one on the inner View/ScrollView would paint over it.
    flex: {
      flex: 1,
    },
    // Re-applies the paddings Screen.tsx:42-45 would have added via `padded`, which is
    // switched off so the ScrollView itself can span the full height.
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    // Separates the card list from the action/prompt block above it. ActiveTripCard
    // carries its own marginBottom, so only the leading gap is needed here.
    cards: {
      marginTop: spacing.lg,
    },
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
