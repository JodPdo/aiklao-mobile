// src/screens/trip/TripDetailScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import type { LeafletData } from '@/components/LeafletMapView';
import { InviteMembersModal } from '@/components/InviteMembersModal';
import { useAuth } from '@/auth/AuthContext';
import { api, createInvite } from '@/api/client';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  getActiveTripId,
  restartBackgroundTracking,
} from '@/services/locationTask';
import { usePowerSaveMode } from '@/hooks/usePowerSaveMode';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList, AppTabParamList } from '@/navigation/types';
import { TripHeader } from './components/TripHeader';
import { TripMapView } from './components/TripMapView';
import { TripStatsCard } from './components/TripStatsCard';
import { MemberList } from './components/MemberList';
import { TripActionBar } from './components/TripActionBar';
import { TripData } from './tripShared';

// ─── Route types ─────────────────────────────────────────────────────────────────
// Shared TripData/Member types + format/avatar helpers live in ./tripShared.

type TripDetailRouteProp = RouteProp<HomeStackParamList, 'TripDetail'>;
type TripDetailNavProp = NativeStackNavigationProp<HomeStackParamList, 'TripDetail'>;

// ─── TripDetailScreen ──────────────────────────────────────────────────────────

export function TripDetailScreen() {
  const route = useRoute<TripDetailRouteProp>();
  const navigation = useNavigation<TripDetailNavProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;

  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { powerSave, batteryLevel, togglePowerSave } = usePowerSaveMode();

  const [data, setData] = useState<TripData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  // Single recenter path shared by the ◎ button and member-row taps (lifted from
  // TripMapView). `token` bumps each call so re-tapping the same target re-centers.
  const [recenter, setRecenter] = useState<{ to?: { lat: number; lng: number }; token: number }>({ token: 0 });

  const focusOnMap = useCallback((coords: { lat: number; lng: number }) => {
    setRecenter(r => ({ to: coords, token: r.token + 1 }));
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<TripData>(`/api/mobile/trips/${tripId}`);
      setData(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (err?.response?.status === 403) {
        setError('คุณไม่ได้เป็นสมาชิกของทริปนี้');
      } else if (err?.response?.status === 404) {
        setError('ไม่พบทริป');
      } else {
        setError('โหลดข้อมูลไม่สำเร็จ');
      }
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      load();
      getActiveTripId().then(setActiveTripId);
    }, [load]),
  );

  // Hide the bottom tab bar while this screen is focused; restore the navigator's
  // default (undefined — NOT a hardcoded style, so it can't fight other screens'
  // tab styling) on blur. Other Home-stack screens keep their tab bar.
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent<BottomTabNavigationProp<AppTabParamList>>();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation]),
  );

  // Derived values — declared before handlers that reference them
  const isArchived = data?.trip.status === 'archived';
  const isSharing = activeTripId === tripId;
  const isEmpty = !data || data.members.every(m => m.lastLocation === null);
  const callerMember = data?.members.find(m => m.lineUserId === user?.lineUserId);
  const canStop = !!callerMember?.isLeader && !isArchived;

  // Auto-refresh every 60s in default mode; stopped when power-save or archived
  useEffect(() => {
    if (powerSave || isArchived) return;
    const id = setInterval(() => { load(); }, 60_000);
    return () => clearInterval(id);
  }, [powerSave, isArchived, load]);

  // Build styles from current palette
  const styles = makeStyles(colors);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setActiveTripId(await getActiveTripId());
    setRefreshing(false);
  }

  async function handleToggleMode() {
    await togglePowerSave();
    if (isSharing) {
      try {
        await restartBackgroundTracking();
      } catch (err: any) {
        console.log('[trip-detail] restart bg failed:', err?.message ?? err);
      }
    }
  }

  async function handleShareLocation() {
    if (isArchived) return;
    const current = await getActiveTripId();
    setActiveTripId(current);
    if (current === tripId) return;

    if (current != null && current !== tripId) {
      Alert.alert(
        'หยุดทริปอื่นและเริ่มทริปนี้?',
        'ทริปที่กำลังแชร์อยู่จะถูกหยุด',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'เริ่มแชร์',
            onPress: async () => {
              await stopBackgroundTracking();
              try {
                await startBackgroundTracking(tripId);
              } catch (err: any) {
                console.log('[trip-detail] bg start failed:', err?.message ?? err);
              }
              setActiveTripId(tripId);
              navigation.navigate('MapScreen', { tripId });
            },
          },
        ],
      );
      return;
    }

    try {
      await startBackgroundTracking(tripId);
    } catch (err: any) {
      console.log('[trip-detail] bg start failed (foreground-only):', err?.message ?? err);
    }
    setActiveTripId(tripId);
    navigation.navigate('MapScreen', { tripId });
  }

  // Header "แชร์" — quick share of the invite link via the native OS share sheet.
  // Leader-only (createInvite is 403 for non-leaders); the call reuses the active
  // invite, so tapping repeatedly is safe (no token spam). เชิญ stays the modal.
  async function handleShareInvite() {
    try {
      const invite = await createInvite(tripId);
      const header = data?.trip.name ? `ร่วมทริปกับเรา: ${data.trip.name}` : 'ร่วมทริปกับเรา';
      await Share.share({ message: `${header}\n${invite.link}` });
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (err?.response?.status === 403) {
        Alert.alert('แชร์ไม่ได้', 'เฉพาะหัวหน้าทริปเท่านั้นที่เชิญเพื่อนได้');
      } else {
        Alert.alert('แชร์ลิงก์ไม่สำเร็จ', 'ลองอีกครั้ง');
      }
    }
  }

  async function handleEndTrip() {
    Alert.alert(
      'จบทริปนี้?',
      'การกระทำนี้ไม่สามารถยกเลิกได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'จบทริป',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/mobile/trips/${tripId}/stop`);
              if (isSharing) await stopBackgroundTracking();
              setActiveTripId(null);
              await load();
            } catch (err: any) {
              if (err?.response?.status === 401) return;
              Alert.alert('ไม่สามารถจบทริปได้', err?.message || 'ลองอีกครั้ง');
            }
          },
        },
      ],
    );
  }

  if (error != null) {
    return (
      <Screen padded={false} style={styles.flex}>
        <TripHeader
          tripName="รายละเอียดทริป"
          onBack={() => navigation.goBack()}
          powerSave={powerSave}
          onTogglePowerSave={handleToggleMode}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="ลองอีกครั้ง" onPress={load} style={{ marginTop: spacing.lg }} />
        </View>
      </Screen>
    );
  }

  if (data == null) {
    return (
      <Screen padded={false} style={styles.flex}>
        <TripHeader
          tripName="รายละเอียดทริป"
          onBack={() => navigation.goBack()}
          powerSave={powerSave}
          onTogglePowerSave={handleToggleMode}
        />
        <View style={styles.centered}>
          <Text style={styles.mutedText}>กำลังโหลด...</Text>
        </View>
      </Screen>
    );
  }

  // Map block (now fixed under the header, ~40% of the screen) — markers for every
  // member with a location, plus the destination. Same data shape the mini-map used.
  const mapHeight = Math.round(windowHeight * 0.4);
  const selfCoords = callerMember?.lastLocation
    ? { lat: callerMember.lastLocation.lat, lng: callerMember.lastLocation.lng }
    : undefined;
  const mapData: LeafletData = {
    members: data.members
      .filter(m => m.lastLocation)
      .map(m => ({
        id: m.id,
        lat: m.lastLocation!.lat,
        lng: m.lastLocation!.lng,
        name: m.displayName,
        pictureUrl: m.pictureUrl || undefined,
        arrivedAt: m.arrivedAt,
      })),
    destination: data.trip.destination
      ? { lat: data.trip.destination.lat, lng: data.trip.destination.lng, name: data.trip.destination.name }
      : undefined,
  };

  // Phase 6.5 arrival summary — surfaced in the members card header (null = hidden)
  const arrivedCount = data.members.filter(m => m.arrivedAt).length;
  const memberCount = data.members.length;
  const arrivalSummaryText =
    arrivedCount === 0
      ? null
      : arrivedCount === memberCount
        ? `✅ ทุกคนถึงจุดหมายแล้ว (${memberCount})`
        : `🚗 ถึงแล้ว ${arrivedCount}/${memberCount} · ยังไม่ถึง ${memberCount - arrivedCount}`;

  return (
    <Screen padded={false} style={styles.flex}>
      <TripHeader
        tripName={data.trip.name}
        onBack={() => navigation.goBack()}
        powerSave={powerSave}
        onTogglePowerSave={handleToggleMode}
        status={data.trip.status}
        isWaiting={isEmpty}
        startedAtIso={data.trip.createdAt}
        onShare={callerMember?.isLeader ? handleShareInvite : undefined}
      />

      {/* Map — directly under the header, fixed ~40% height (overlays + SOS slot inside) */}
      <TripMapView
        data={mapData}
        height={mapHeight}
        powerSave={powerSave}
        live={!isEmpty}
        destination={data.trip.destination}
        recenterTo={recenter.to}
        recenterToken={recenter.token}
        onRecenter={selfCoords ? () => focusOnMap(selfCoords) : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats card — จุดหมาย | ระยะ (ETA hidden behind SHOW_ETA until backend returns it).
            ระยะ = self member's distance-to-destination (lastLocation.distanceKm). */}
        <TripStatsCard
          destinationName={data.trip.destination?.name ?? null}
          distanceKm={callerMember?.lastLocation?.distanceKm ?? null}
        />

        {/* CTA banner — empty + default mode only */}
        {isEmpty && !powerSave && (
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerText}>
              ยังไม่มีใครแชร์ตำแหน่ง — กด "📍 เริ่มแชร์ตำแหน่ง" ด้านล่างเพื่อเริ่ม
            </Text>
          </View>
        )}

        {/* Members card — header (สมาชิก N + เชิญ) · rows · เพิ่มสมาชิก.
            เชิญ/เพิ่มสมาชิก are leader-only and reuse the existing InviteMembersModal. */}
        <MemberList
          members={data.members}
          selfLineUserId={user?.lineUserId}
          summary={arrivalSummaryText}
          onInvite={callerMember?.isLeader ? () => setShowInvite(true) : undefined}
          onMemberPress={
            powerSave
              ? undefined   // map is a placeholder in power-save — nothing to recenter
              : (m) => m.lastLocation && focusOnMap({ lat: m.lastLocation.lat, lng: m.lastLocation.lng })
          }
        />

        {/* Caption — auto-refresh cadence (mode-aware: preserves power-save messaging) */}
        <Text style={styles.refreshCaption}>
          {powerSave
            ? `🔋 โหมดประหยัด${batteryLevel !== null ? ` (${Math.round(batteryLevel * 100)}%)` : ''} · ดึงลงเพื่อรีเฟรชเท่านั้น`
            : 'ตำแหน่งอัปเดตอัตโนมัติทุก 60 วินาที'}
        </Text>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky action bar — hidden for archived trips (unchanged) */}
      {!isArchived && (
        <TripActionBar
          isSharing={isSharing}
          canInvite={!!callerMember?.isLeader}
          canStop={canStop}
          bottomInset={Math.max(insets.bottom, spacing.lg)}
          onShareLocation={handleShareLocation}
          onInvite={() => setShowInvite(true)}
          onEndTrip={handleEndTrip}
        />
      )}

      <InviteMembersModal
        visible={showInvite}
        tripId={tripId}
        tripName={data.trip.name}
        onClose={() => setShowInvite(false)}
      />
    </Screen>
  );
}

// ─── Theme-aware styles factory ────────────────────────────────────────────────

function makeStyles(c: Palette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.background,   // theme default page bg (Task #1) — no hardcoded pink
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },

    // ScrollView
    scroll: { flex: 1 },
    scrollContent: {
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },

    // CTA banner (empty state, default mode)
    ctaBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    ctaBannerText: {
      ...typography.bodySmall,
      color: '#92400E',
      textAlign: 'center',
    },

    // Auto-refresh caption (under the members card)
    refreshCaption: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },

    // Utility
    errorText: {
      ...typography.body,
      color: c.danger,
      textAlign: 'center',
    },
    mutedText: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
}
