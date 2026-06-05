// src/screens/map/MapScreen.tsx
// Phase 5.2 Session C: permission gate + map render framework.
// Session D: tripId param (backend wiring verified).
// Session E Path 1: Stop button on Path B placeholder.
// Phase 5.3 Session B: REMOVE watchPositionAsync (Pattern A — background task is sole POST
//   trigger). stopBackgroundTracking called on Stop. Tracking status indicator added.
// Phase 6.1A: Replace Path B placeholder with LeafletMapView (WebView + OSM tiles).
// Phase 6.2 Session B: SOS button (hold-to-fire), 🚨 marker, active-SOS banner.
//   SOS is a one-shot user action — NOT part of the background location stream (Pattern A).
//   SOS state derived from tripData.activeSos[] (single source of truth) + optimistic local.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LocationPermissionGate } from '@/permissions/LocationPermissionGate';
import { SosButton } from '@/components/SosButton';
import { LeafletMapView, LeafletData, SosMarker } from '@/components/LeafletMapView';
import { api, triggerSos, cancelSos } from '@/api/client';
import { stopBackgroundTracking } from '@/services/locationTask';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

// ─── Types (mirrors backend GET /:id, Phase 6.2 adds activeSos) ─────────────────

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

interface ActiveSos {
  id: string;
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  lat: number;
  lng: number;
  triggeredAt: string;
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
  activeSos: ActiveSos[];
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  });
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
  const [mySosId, setMySosId] = useState<string | null>(null);
  const [sosTimeHHMM, setSosTimeHHMM] = useState<string>('');
  const styles = makeStyles(colors);

  // Background permission check — for tracking status badge
  useEffect(() => {
    Location.getBackgroundPermissionsAsync()
      .then(({ status }) => setBgGranted(status === 'granted'))
      .catch(() => setBgGranted(false));
  }, []);

  // Fetch trip data (members + destination + activeSos). Lifted to useCallback so
  // SOS handlers can trigger an immediate refetch (poll cadence is 60s — too slow).
  const fetchTrip = useCallback(async () => {
    try {
      const res = await api.get<TripData>(`/api/mobile/trips/${tripId}`);
      setTripData(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      console.log('[map] fetch failed:', err?.message);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
    const intervalId = setInterval(fetchTrip, 60_000);
    return () => clearInterval(intervalId);
  }, [fetchTrip]);

  // One-shot self-position (Option A — bg task already handles POST updates)
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
  const selfMember = tripData?.members.find(
    (m) => m.lineUserId === user?.lineUserId
  );

  const selfMarkerCoords = selfMember?.lastLocation
    ? { lat: selfMember.lastLocation.lat, lng: selfMember.lastLocation.lng }
    : selfPosition;

  const selfPictureUrl = selfMember?.pictureUrl || user?.pictureUrl || undefined;

  // My own active SOS (coercion-safe: backend userId is stringified BIGINT;
  // user.id is string but could be number after future auth changes).
  const myActiveSos = tripData?.activeSos?.find(
    (s) => String(s.userId) === String(user?.id)
  ) ?? null;

  // Reconcile local SOS state with server truth whenever my active SOS changes.
  useEffect(() => {
    if (myActiveSos) {
      setMySosId(String(myActiveSos.id));
      setSosTimeHHMM(fmtTime(myActiveSos.triggeredAt));
    } else {
      setMySosId(null);
      setSosTimeHHMM('');
    }
  }, [myActiveSos?.id]);

  // SOS markers for the map (all active SOS on this trip, not just mine)
  const sosMarkers: SosMarker[] = (tripData?.activeSos ?? []).map((s) => ({
    id: String(s.id),
    lat: s.lat,
    lng: s.lng,
    name: s.displayName,
    timeHHMM: fmtTime(s.triggeredAt),
  }));

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
    sosMarkers,
  };

  // REV 2 — Alert.alert wrappers (UI confirm before calling the actual API handlers)

  const handleSosPress = () => {
    if (!selfMarkerCoords) {
      Alert.alert('ส่ง SOS ไม่ได้', 'ยังไม่มีพิกัดของคุณในระบบ');
      return;
    }
    Alert.alert(
      '🚨 ยืนยันส่งสัญญาณ SOS?',
      'สมาชิกทุกคนในทริปจะได้รับแจ้งเตือนทันที พร้อมตำแหน่งปัจจุบันของคุณ',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ส่ง SOS', style: 'destructive', onPress: handleSosConfirm },
      ],
    );
  };

  const handleSosCancelPress = (sosId: string) => {
    Alert.alert(
      'ยืนยันยกเลิก SOS?',
      'สมาชิกทุกคนจะเห็นว่า SOS ของคุณถูกยกเลิก',
      [
        { text: 'ไม่', style: 'cancel' },
        { text: 'ยกเลิก SOS', style: 'destructive', onPress: () => handleSosCancel(sosId) },
      ],
    );
  };

  // Actual API calls (confirm UI lives in the *Press wrappers above)

  const handleSosConfirm = async () => {
    try {
      const sos = await triggerSos(String(tripId), {
        lat: selfMarkerCoords!.lat,
        lng: selfMarkerCoords!.lng,
        accuracy_m: selfMember?.lastLocation?.accuracyM ?? undefined,
      });
      // Instant UX — optimistic local state so banner appears with no lag
      setMySosId(sos.id);
      setSosTimeHHMM(fmtTime(sos.triggeredAt));
      // Immediate refetch so activeSos[] populates the SOS marker (60s poll too slow)
      fetchTrip();
    } catch (e: any) {
      if (e.code === 'ACTIVE_SOS_EXISTS') {
        if (e.existingId) setMySosId(String(e.existingId));
        fetchTrip();
        Alert.alert('SOS ส่งไปแล้ว', 'คุณมี SOS ที่ยังไม่ยกเลิกอยู่');
      } else {
        Alert.alert('ส่ง SOS ไม่สำเร็จ', e.message || 'ลองอีกครั้ง');
      }
    }
  };

  const handleSosCancel = async (sosId: string) => {
    try {
      await cancelSos(String(tripId), sosId);
      setMySosId(null);
      fetchTrip();
    } catch (e: any) {
      Alert.alert('ยกเลิกไม่สำเร็จ', e.message || 'ลองอีกครั้ง');
    }
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
        {/* Active SOS Banner — pushes map down when own SOS active */}
        {mySosId && (
          <View style={styles.sosBanner}>
            <Text style={styles.sosBannerText}>🚨 SOS ACTIVE · {sosTimeHHMM}</Text>
            <Pressable onPress={() => handleSosCancelPress(mySosId)} hitSlop={12}>
              <Text style={styles.sosBannerCancel}>ยกเลิก ✕</Text>
            </Pressable>
          </View>
        )}

        {/* Leaflet map */}
        <LeafletMapView data={mapData} style={styles.map} />

        {/* SOS button — bottom-LEFT corner (REV 2) */}
        <View style={styles.sosButtonWrap}>
          <SosButton
            size={40}
            onPress={handleSosPress}
            activeSosId={mySosId}
            onCancelSos={handleSosCancelPress}
          />
        </View>

        {/* Footer (info only) — bottom-left so it clears the Stop button */}
        <View style={styles.footer} pointerEvents="none">
          <Text style={styles.footerText}>Trip #{tripId}</Text>
          {trackingLabel !== null && (
            <Text style={styles.footerText}>{trackingLabel}</Text>
          )}
        </View>

        {/* Stop button — compact, bottom-right corner */}
        <View style={styles.stopButtonWrap}>
          <Pressable
            style={[styles.stopButton, isStopping && { opacity: 0.5 }]}
            onPress={handleStop}
            disabled={isStopping}
          >
            <Text style={styles.stopButtonText}>⏹ Stop</Text>
          </Pressable>
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
    sosBanner: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 12,
    },
    sosBannerText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    sosBannerCancel: { color: '#fff', fontSize: 14, textDecorationLine: 'underline' },
    sosButtonWrap: {
      position: 'absolute',
      bottom: spacing.lg,         // same vertical as Stop button — symmetric corners
      left: spacing.lg,
    },
    footer: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.85)',  // readable over map tiles
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    footerText: {
      ...typography.caption,
      color: '#374151',           // dark slate — legible on the translucent pill
    },
    stopButtonWrap: {
      position: 'absolute', bottom: spacing.lg, right: spacing.lg,
    },
    stopButton: {
      backgroundColor: '#DC2626', paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 8, minWidth: 60, alignItems: 'center',
    },
    stopButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  });
}
