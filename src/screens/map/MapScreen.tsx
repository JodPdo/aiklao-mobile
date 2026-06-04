// src/screens/map/MapScreen.tsx
// Phase 5.2 Session C: permission gate + map render framework.
// Session D: tripId param (backend wiring verified).
// Session E Path 1: Stop button on Path B placeholder.
// Phase 5.3 Session B: REMOVE watchPositionAsync (Pattern A — background task is sole POST
//   trigger). stopBackgroundTracking called on Stop. Tracking status indicator added.
// Phase 6.1A: Replace Path B placeholder with LeafletMapView (WebView + OSM tiles).
//   Self-position: one-shot getCurrentPositionAsync (Option A — bg task already running).
//   Members + destination: GET /api/mobile/trips/:id polled every 60s.

import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LocationPermissionGate } from '@/permissions/LocationPermissionGate';
import { Button } from '@/components/Button';
import { LeafletMapView, LeafletData } from '@/components/LeafletMapView';
import { api } from '@/api/client';
import { stopBackgroundTracking } from '@/services/locationTask';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

// ─── Types (mirrors TripDetailScreen.TripData, confirmed from Checkpoint A) ────

interface LastLocation {
  lat: number;
  lng: number;
  distanceKm: number | null;
  accuracyM: number | null;
  distanceFromLeaderKm: number | null;
  createdAt: string;
}

interface TripMember {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  isLeader: boolean;
  joinedAt: string;
  arrivedAt: string | null;
  lastLocation: LastLocation | null;
}

interface TripData {
  trip: {
    id: string;
    name: string;
    status: string;
    destination: { lat: number; lng: number; name: string } | null;
    createdAt: string;
    allArrivedAt: string | null;
    endedAt: string | null;
    durationSeconds: number;
    totalDistanceKm: number | null;
  };
  members: TripMember[];
}

// ─── Screen ────────────────────────────────────────────────────────────────────

type MapScreenProps = {
  route: RouteProp<HomeStackParamList, 'MapScreen'>;
};

type MapNavProp = NativeStackNavigationProp<HomeStackParamList, 'MapScreen'>;

export function MapScreen({ route }: MapScreenProps) {
  const { tripId } = route.params;
  const navigation = useNavigation<MapNavProp>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isStopping, setIsStopping] = useState(false);
  const [bgGranted, setBgGranted] = useState<boolean | null>(null);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [selfPosition, setSelfPosition] = useState<{ lat: number; lng: number } | null>(null);
  const styles = makeStyles(colors);

  // Background permission check — for tracking status badge
  useEffect(() => {
    Location.getBackgroundPermissionsAsync()
      .then(({ status }) => setBgGranted(status === 'granted'))
      .catch(() => setBgGranted(false));
  }, []);

  // Fetch trip data (members + destination) on mount + every 60s
  useEffect(() => {
    let mounted = true;

    async function fetchTrip() {
      try {
        const res = await api.get<TripData>(`/api/mobile/trips/${tripId}`);
        if (mounted) setTripData(res.data);
      } catch (err: any) {
        if (err?.response?.status === 401) return;
        console.log('[map] fetch failed:', err?.message);
      }
    }

    fetchTrip();
    const intervalId = setInterval(fetchTrip, 60_000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [tripId]);

  // One-shot self-position (Option A — bg task already handles POST updates)
  // Subsequent self-position updates come from members[] in API response
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) setSelfPosition({ lat: fix.coords.latitude, lng: fix.coords.longitude });
      } catch (err: any) {
        console.log('[map] initial location failed:', err?.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Self position derivation (single source of truth):
  // 1. Prefer self's member entry from API (auto-refreshes with 60s polling)
  // 2. Fall back to one-shot GPS only if API hasn't returned self yet
  //    (e.g., first 5-10 sec after trip start, before first POST)
  const selfMember = tripData?.members.find(
    (m) => m.lineUserId === user?.lineUserId
  );

  const selfMarkerCoords = selfMember?.lastLocation
    ? { lat: selfMember.lastLocation.lat, lng: selfMember.lastLocation.lng }
    : selfPosition;

  // Profile pic single source of truth: API self entry → auth fallback (StoredUser)
  const selfPictureUrl = selfMember?.pictureUrl || user?.pictureUrl || undefined;

  const mapData: LeafletData = {
    self: selfMarkerCoords
      ? { lat: selfMarkerCoords.lat, lng: selfMarkerCoords.lng, name: 'คุณ', pictureUrl: selfPictureUrl }
      : undefined,
    members: (tripData?.members ?? [])
      .filter((m) => m.lineUserId !== user?.lineUserId)
      .filter((m) => m.lastLocation !== null)
      .map((m) => ({
        id: m.id,
        lat: m.lastLocation!.lat,
        lng: m.lastLocation!.lng,
        name: m.displayName,
        pictureUrl: m.pictureUrl || undefined,
      })),
    destination: tripData?.trip?.destination != null
      ? {
          lat: tripData.trip.destination.lat,
          lng: tripData.trip.destination.lng,
          name: tripData.trip.destination.name,
        }
      : undefined,
  };

  function handleStop() {
    if (isStopping) return;
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
        {/* Leaflet map — replaces Path B placeholder (Phase 6.1A) */}
        <LeafletMapView data={mapData} style={styles.map} />

        {/* Floating Stop button — bottom-center, overlaid on map */}
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    map: {
      flex: 1,
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
      color: c.textSecondary,
    },
    trackingLabel: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: spacing.xs,
    },
  });
}
