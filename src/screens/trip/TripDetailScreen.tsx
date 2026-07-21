// src/screens/trip/TripDetailScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
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
import { t } from '@/i18n';
import { api } from '@/api/client';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  getActiveTripId,
  isTrackingActive,
} from '@/services/locationTask';
import { usePowerSaveMode } from '@/hooks/usePowerSaveMode';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList, AppTabParamList } from '@/navigation/types';
import { TripHeader } from './components/TripHeader';
import { TripMapView } from './components/TripMapView';
import { TripStatsCard } from './components/TripStatsCard';
import { MembersSheet } from './components/MembersSheet';
import { TripActionBar } from './components/TripActionBar';
import { TripMoreActionsSheet } from './components/TripMoreActionsSheet';
import { TripData } from './tripShared';
import { useSos, SosCoords } from './useSos';
import { useLeaveTrip } from './useLeaveTrip';

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
  const { powerSave, batteryLevel } = usePowerSaveMode();

  const [data, setData] = useState<TripData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  // One-shot self-position fallback for SOS coords (mirrors MapScreen) — used when
  // the caller has no lastLocation yet so SOS still works.
  const [selfPosition, setSelfPosition] = useState<{ lat: number; lng: number } | null>(null);
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
        setError(t('trip.error.notMember'));
      } else if (err?.response?.status === 404) {
        setError(t('trip.error.notFound'));
      } else {
        setError(t('trip.error.loadFailed'));
      }
    }
  }, [tripId]);

  // B2-3: getActiveTripId() alone only reflects intent — it can go stale if the OS killed
  // the background task without going through stopBackgroundTracking() (permission revoked,
  // force-quit, battery kill). Cross-check the real task state and self-heal the stored flag
  // so the share toggle can't show ON when nothing is actually being sent.
  const refreshSharingState = useCallback(async () => {
    const [storedTripId, reallyRunning] = await Promise.all([getActiveTripId(), isTrackingActive()]);
    if (storedTripId === tripId && !reallyRunning) {
      await stopBackgroundTracking();
      setActiveTripId(null);
    } else {
      setActiveTripId(storedTripId);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshSharingState();
    }, [load, refreshSharingState]),
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

  // Auto-refresh every 60s in default mode; stopped when power-save or archived
  useEffect(() => {
    if (powerSave || isArchived) return;
    const id = setInterval(() => { load(); }, 60_000);
    return () => clearInterval(id);
  }, [powerSave, isArchived, load]);

  // One-shot self-position fix on mount (mirrors MapScreen). Requires foreground
  // location permission (granted elsewhere in the app); on failure selfPosition
  // stays null and SOS falls back to callerMember.lastLocation.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) setSelfPosition({ lat: fix.coords.latitude, lng: fix.coords.longitude });
      } catch (err: any) {
        console.log('[trip-detail] initial location failed:', err?.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Synchronous coords read for SOS (parity with MapScreen's selfMarkerCoords):
  // callerMember.lastLocation ?? one-shot fix; accuracy from lastLocation only.
  const getSosCoords = useCallback((): SosCoords | null => {
    const ll = callerMember?.lastLocation;
    const coords = ll ? { lat: ll.lat, lng: ll.lng } : selfPosition;
    if (!coords) return null;
    return { lat: coords.lat, lng: coords.lng, accuracyM: ll?.accuracyM ?? undefined };
  }, [callerMember, selfPosition]);

  // Shared SOS controller (identical behavior to MapScreen).
  const sos = useSos({
    tripId,
    activeSos: data?.activeSos,
    user,
    getCoords: getSosCoords,
    refetch: load,
  });

  // SOS is shown on ACTIVE trips only — hidden on archived.
  const sosVisible = !isArchived;

  // MB-5: member self-leave controller (leader never gets this — see file header wiring below).
  const { handleLeaveTrip } = useLeaveTrip({ tripId, isSharing, navigation, reloadTrip: load });

  // Build styles from current palette
  const styles = makeStyles(colors);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    await refreshSharingState();
    setRefreshing(false);
  }

  async function handleEndTrip() {
    Alert.alert(
      t('trip.endTrip.title'),
      t('trip.endTrip.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trip.endTrip.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/mobile/trips/${tripId}/stop`);
              if (isSharing) await stopBackgroundTracking();
              setActiveTripId(null);
              await load();
            } catch (err: any) {
              if (err?.response?.status === 401) return;
              Alert.alert(t('trip.endTrip.failed'), err?.message || t('common.retry'));
            }
          },
        },
      ],
    );
  }

  // Single toggle: press while OFF starts sharing, press while ON stops it. No confirm
  // dialog either direction — B2-1's mandate is that stopping must be instant/frictionless,
  // and requiring confirmation to start would just be extra taps for the common case.
  async function handleToggleSharing() {
    setSharingLoading(true);
    try {
      if (isSharing) {
        await stopBackgroundTracking();
      } else {
        await startBackgroundTracking(tripId);
      }
      await refreshSharingState();
    } catch (err: any) {
      Alert.alert(
        isSharing ? t('trip.sharing.stopFailedTitle') : t('trip.sharing.startFailedTitle'),
        err?.message || t('common.retry'),
      );
    } finally {
      setSharingLoading(false);
    }
  }

  if (error != null) {
    return (
      <Screen padded={false} style={styles.flex}>
        <TripHeader
          tripName={t('trip.title')}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label={t('common.retry')} onPress={load} style={{ marginTop: spacing.lg }} />
        </View>
      </Screen>
    );
  }

  if (data == null) {
    return (
      <Screen padded={false} style={styles.flex}>
        <TripHeader
          tripName={t('trip.title')}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <Text style={styles.mutedText}>{t('trip.loading')}</Text>
        </View>
      </Screen>
    );
  }

  // Map block (fills ~70% of the viewport via flex — see styles.mapWrap). Markers
  // for every member with a location, plus the destination.
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
    sosMarkers: sosVisible ? sos.sosMarkers : undefined,   // all members' active SOS
  };

  return (
    <Screen padded={false} style={styles.flex}>
      <TripHeader
        tripName={data.trip.name}
        onBack={() => navigation.goBack()}
        status={data.trip.status}
        isWaiting={isEmpty}
        startedAtIso={data.trip.createdAt}
      />

      {/* Active-SOS banner — self only, active trips only; above the map (mirrors MapScreen) */}
      {sosVisible && sos.mySosId && (
        <View style={styles.sosBanner}>
          <Text style={styles.sosBannerText}>{t('sos.bannerActive', { time: sos.sosTimeHHMM })}</Text>
          <Pressable onPress={() => sos.handleSosCancelPress(sos.mySosId!)} hitSlop={12}>
            <Text style={styles.sosBannerCancel}>{t('common.cancel')} ✕</Text>
          </Pressable>
        </View>
      )}

      {/* Map — under the header, ~70% of the viewport via flex (mapWrap flex 7 :
          scroll flex 1). Overlays + SOS slot live inside TripMapView. */}
      <View style={styles.mapWrap}>
        <TripMapView
          data={mapData}
          powerSave={powerSave}
          live={!isEmpty}
          destination={data.trip.destination}
          recenterTo={recenter.to}
          recenterToken={recenter.token}
          onRecenter={selfCoords ? () => focusOnMap(selfCoords) : undefined}
          activeSosId={sosVisible ? sos.mySosId : null}
          onSosPress={sosVisible ? sos.handleSosPress : undefined}
          onCancelSos={sos.handleSosCancelPress}
        />
      </View>

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
              {t('trip.emptyCta')}
            </Text>
          </View>
        )}

        {/* Caption — auto-refresh cadence (mode-aware: preserves power-save messaging) */}
        <Text style={styles.refreshCaption}>
          {powerSave
            ? `🔋 ${t('trip.caption.powerSave', { battery: batteryLevel !== null ? ` (${Math.round(batteryLevel * 100)}%)` : '' })}`
            : t('trip.caption.autoRefresh')}
        </Text>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky action bar — hidden for archived trips */}
      {!isArchived && (
        <TripActionBar
          memberCount={data.members.length}
          isSharing={isSharing}
          sharingLoading={sharingLoading}
          onToggleSharing={handleToggleSharing}
          bottomInset={Math.max(insets.bottom, spacing.lg)}
          onMembers={() => setShowMembers(true)}
          onMore={() => setShowMore(true)}
        />
      )}

      {/* Members sheet — opened by the action bar; its header เชิญ swaps to the invite modal */}
      <MembersSheet
        visible={showMembers}
        members={data.members}
        selfLineUserId={user?.lineUserId}
        onInvite={callerMember?.isLeader ? () => { setShowMembers(false); setShowInvite(true); } : undefined}
        onClose={() => setShowMembers(false)}
      />

      {/* More sheet — infrequent actions relocated out of the primary bar (B1-1); rows are
          role-gated inside the sheet itself: leader gets Invite/End-trip, a member gets
          Leave-trip (MB-5) — never both, and never empty for either role. */}
      <TripMoreActionsSheet
        visible={showMore}
        onInvite={callerMember?.isLeader ? () => { setShowMore(false); setShowInvite(true); } : undefined}
        onEndTrip={callerMember?.isLeader ? () => { setShowMore(false); handleEndTrip(); } : undefined}
        onLeaveTrip={!callerMember?.isLeader ? () => { setShowMore(false); handleLeaveTrip(); } : undefined}
        onClose={() => setShowMore(false)}
      />

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

    // Active-SOS banner — B2-5: was a hardcoded #DC2626 (one of 3 copy-pasted spots this
    // ticket closes); colors.danger also fixes this banner never adapting to dark mode before.
    sosBanner: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: c.danger, paddingHorizontal: 16, paddingVertical: 12,
    },
    sosBannerText: { color: c.white, fontSize: 15, fontWeight: '700' },
    sosBannerCancel: { color: c.white, fontSize: 14, textDecorationLine: 'underline' },

    // Map region — flex 7 against the ScrollView's flex 1 ⇒ map ≈ 70% of the
    // viewport (the rest is header + action bar + the scrollable content). No
    // hardcoded pixel height; SafeArea handled by Screen (top) + action bar (bottom).
    mapWrap: { flex: 7 },

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
