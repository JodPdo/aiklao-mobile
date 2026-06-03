// src/screens/trip/TripDetailScreen.tsx

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  getActiveTripId,
} from '@/services/locationTask';
import { colors, radius, spacing, typography } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min — tune in Session D after device QA

const AVATAR_PALETTE = ['#7F77DD', '#D85A30', '#1D9E75', '#D4537E', '#E89B23', '#3B82F6'];

function avatarColor(lineUserId: string): string {
  return AVATAR_PALETTE[(lineUserId.charCodeAt(1) || 0) % AVATAR_PALETTE.length];
}

function avatarChar(displayName: string): string {
  return displayName.charAt(0) || '?';
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LastLocation {
  lat: number;
  lng: number;
  distanceKm: number | null;
  accuracyM: number | null;
  distanceFromLeaderKm: number | null;
  createdAt: string;
}

interface Member {
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
    status: 'active' | 'archived';
    destination: { lat: number; lng: number; name: string } | null;
    createdAt: string;
    allArrivedAt: string | null;
    endedAt: string | null;
    durationSeconds: number;
    totalDistanceKm: number | null;
  };
  members: Member[];
}

type TripDetailRouteProp = RouteProp<HomeStackParamList, 'TripDetail'>;
type TripDetailNavProp = NativeStackNavigationProp<HomeStackParamList, 'TripDetail'>;

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const timeStr = d.toTimeString().slice(0, 5);
  return `${dateStr} · เริ่ม ${timeStr}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m} นาที`;
}

function formatRelativeTime(iso: string): string {
  const age = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(age / 1000);
  if (sec < 60) return `${sec} วินาทีที่แล้ว`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  return `${hr} ชม.ที่แล้ว`;
}

function memberStatusLabel(member: Member): string {
  if (member.isLeader) return 'หัวหน้า';
  if (!member.lastLocation) return 'รอ';
  const age = Date.now() - new Date(member.lastLocation.createdAt).getTime();
  if (age > OFFLINE_THRESHOLD_MS) return 'ออฟไลน์';
  return `${member.lastLocation.distanceFromLeaderKm?.toFixed(1) ?? '?'} กม.`;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ member }: { member: Member }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = !member.pictureUrl || imgFailed;
  const bg = avatarColor(member.lineUserId);
  const char = avatarChar(member.displayName);
  const isOnline =
    !!member.lastLocation &&
    Date.now() - new Date(member.lastLocation.createdAt).getTime() <= OFFLINE_THRESHOLD_MS;

  return (
    <View style={styles.avatarWrapper}>
      {showFallback ? (
        <View style={[styles.avatar, { backgroundColor: bg }, member.isLeader && styles.avatarLeaderRing]}>
          <Text style={styles.avatarChar}>{char}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: member.pictureUrl! }}
          style={[styles.avatar, member.isLeader && styles.avatarLeaderRing]}
          onError={() => setImgFailed(true)}
        />
      )}
      {!member.isLeader && isOnline && <View style={styles.liveDot} />}
    </View>
  );
}

// ─── AppBar ────────────────────────────────────────────────────────────────────

function TripDetailAppBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.appBar}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.appBarTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.appBarRight}>
        {/* Share — Session E placeholder */}
        <Text style={styles.shareIcon}>↑</Text>
      </View>
    </View>
  );
}

// ─── TripDetailScreen ──────────────────────────────────────────────────────────

export function TripDetailScreen() {
  const route = useRoute<TripDetailRouteProp>();
  const navigation = useNavigation<TripDetailNavProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;

  const [data, setData] = useState<TripData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

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

  // Derived values — declared before handlers that reference them
  const isArchived = data?.trip.status === 'archived';
  const isSharing = activeTripId === tripId;
  const isEmpty = !data || data.members.every(m => m.lastLocation === null);
  const callerMember = data?.members.find(m => m.lineUserId === user?.lineUserId);
  const canStop = !!callerMember?.isLeader && !isArchived;

  const latestTs = data?.members
    .flatMap(m => (m.lastLocation ? [m.lastLocation.createdAt] : []))
    .sort()
    .at(-1);
  const lastUpdated = latestTs != null ? formatRelativeTime(latestTs) : null;

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setActiveTripId(await getActiveTripId());
    setRefreshing(false);
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
        <TripDetailAppBar title="รายละเอียดทริป" onBack={() => navigation.goBack()} />
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
        <TripDetailAppBar title="รายละเอียดทริป" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.mutedText}>กำลังโหลด...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.flex}>
      <TripDetailAppBar title={data.trip.name} onBack={() => navigation.goBack()} />

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
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroDate}>{formatDate(data.trip.createdAt)}</Text>
          {data.trip.destination != null && (
            <Text style={styles.heroDestination}>📍 {data.trip.destination.name}</Text>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {isEmpty || data.trip.totalDistanceKm == null
                  ? '—'
                  : data.trip.totalDistanceKm.toFixed(1)}
              </Text>
              <Text style={styles.heroStatUnit}>กม.</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {isEmpty ? 'เพิ่งเริ่ม' : formatDuration(data.trip.durationSeconds)}
              </Text>
            </View>
          </View>

          {isArchived ? (
            <View style={[styles.badge, styles.badgeArchived]}>
              <Text style={[styles.badgeText, styles.badgeTextMuted]}>จบแล้ว</Text>
            </View>
          ) : isEmpty ? (
            <View style={[styles.badge, styles.badgeWaiting]}>
              <View style={[styles.pulseDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.badgeText}>รอข้อมูล</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeActive]}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>กำลังเดินทาง</Text>
            </View>
          )}
        </View>

        {/* Map placeholder — Path B until Google Maps API key (Session E.1.5) */}
        <View style={styles.mapBox}>
          <Text style={styles.mapEmoji}>{isEmpty ? '📍' : '🗺️'}</Text>
          <Text style={styles.mapHint}>
            {isEmpty
              ? 'ยังไม่มีข้อมูลตำแหน่ง'
              : 'แผนที่ต้องการ Google Maps API key\n(Session E.1.5)'}
          </Text>
        </View>

        {/* Yellow CTA banner — empty state only */}
        {isEmpty && (
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerText}>
              ใช้แอป AiKlao Mobile — การแชร์ตำแหน่งต้องเปิดผ่านแอปเท่านั้น
            </Text>
          </View>
        )}

        {/* Last-updated bar — populated state only */}
        {!isEmpty && lastUpdated != null && (
          <View style={styles.lastUpdatedBar}>
            <View style={styles.liveDotInline} />
            <Text style={styles.lastUpdatedText}>
              อัพเดต {lastUpdated} · จากแอป AiKlao Mobile
            </Text>
          </View>
        )}

        {/* Members horizontal scroll */}
        <Text style={styles.sectionTitle}>สมาชิก ({data.members.length})</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersRow}
        >
          {data.members.map(member => (
            <View key={member.id} style={styles.memberCard}>
              <Avatar member={member} />
              <Text style={styles.memberName} numberOfLines={1}>{member.displayName}</Text>
              <Text
                style={[
                  styles.memberStatus,
                  memberStatusLabel(member) === 'ออฟไลน์' && styles.memberStatusOffline,
                ]}
              >
                {memberStatusLabel(member)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky action buttons */}
      {!isArchived && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {isEmpty ? (
            <Button
              label="เปิดแอป AiKlao"
              fullWidth
              onPress={() => {}}
            />
          ) : isSharing ? (
            <Button label="กำลังแชร์อยู่" fullWidth disabled />
          ) : (
            <Button label="แชร์ตำแหน่ง" fullWidth onPress={handleShareLocation} />
          )}
          <Button
            label="จบทริป"
            variant={canStop ? 'danger' : 'secondary'}
            fullWidth
            disabled={!canStop}
            onPress={handleEndTrip}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      )}
    </Screen>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  // AppBar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: colors.textInverse,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
  },
  appBarTitle: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '700',
    flex: 1,
  },
  appBarRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    color: colors.textInverse,
    fontSize: 20,
  },

  // ScrollView
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroDate: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.xs,
  },
  heroDestination: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  heroStatValue: {
    ...typography.h2,
    color: colors.textInverse,
  },
  heroStatUnit: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  badgeActive: { backgroundColor: 'rgba(52,211,153,0.25)' },
  badgeWaiting: { backgroundColor: 'rgba(232,155,35,0.25)' },
  badgeArchived: { backgroundColor: 'rgba(255,255,255,0.12)' },
  badgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  badgeTextMuted: { color: 'rgba(255,255,255,0.65)' },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#34D399', // mockup live green (active badge)
  },

  // Map placeholder
  mapBox: {
    height: 140,
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  mapEmoji: { fontSize: 36 },
  mapHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // CTA banner (empty state)
  ctaBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ctaBannerText: {
    ...typography.bodySmall,
    color: '#92400E',
    textAlign: 'center',
  },

  // Last-updated bar
  lastUpdatedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  liveDotInline: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#10B981', // mockup live green — add to theme in Session D
  },
  lastUpdatedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Section header
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  // Members
  membersRow: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  memberCard: {
    width: 72,
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    width: 72,
  },
  memberStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  memberStatusOffline: { color: colors.gray500 },

  // Avatar
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLeaderRing: {
    borderWidth: 2.5,
    borderColor: colors.warning,
  },
  avatarChar: {
    ...typography.h3,
    color: colors.textInverse,
  },
  liveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: radius.pill,
    backgroundColor: '#10B981', // mockup live green — add to theme in Session D
    borderWidth: 2,
    borderColor: colors.backgroundAlt,
  },

  // Action bar
  actionBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Utility
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  mutedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
