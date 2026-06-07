// src/screens/trip/TripDetailScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { LivePulseDot } from '@/components/LivePulseDot';
import { LeafletMapView } from '@/components/LeafletMapView';
import { InviteMembersModal } from '@/components/InviteMembersModal';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
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

// Phase 6.5 — HH:MM in Bangkok time for the arrival timestamp
function fmtTimeHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  });
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

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 60_000;
}

function getBatteryColor(percent: number): string {
  if (percent >= 50) return '#0F6E56';
  if (percent >= 20) return '#854F0B';
  return '#791F1F';
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ member, size = 52 }: { member: Member; size?: number }) {
  const { colors } = useTheme();  // Option B — sub-component owns its theme
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = !member.pictureUrl || imgFailed;
  const bg = avatarColor(member.lineUserId);
  const char = avatarChar(member.displayName);
  const isOnline =
    !!member.lastLocation &&
    Date.now() - new Date(member.lastLocation.createdAt).getTime() <= OFFLINE_THRESHOLD_MS;

  const avatarStyle = [
    avatarStaticStyles.base,
    { width: size, height: size, borderRadius: size / 2 },
    member.isLeader && { borderWidth: 2.5, borderColor: colors.warning },
  ] as const;

  return (
    <View style={avatarStaticStyles.wrapper}>
      {showFallback ? (
        <View style={[...avatarStyle, { backgroundColor: bg }]}>
          <Text style={[avatarStaticStyles.char, { color: colors.textInverse }, size < 52 && { fontSize: 14 }]}>
            {char}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: member.pictureUrl! }}
          style={avatarStyle as any}
          onError={() => setImgFailed(true)}
        />
      )}
      {!member.isLeader && isOnline && (
        <View style={[avatarStaticStyles.liveDot, { backgroundColor: colors.live, borderColor: colors.backgroundAlt }]} />
      )}
    </View>
  );
}

const avatarStaticStyles = StyleSheet.create({
  wrapper: { position: 'relative' },
  base: { alignItems: 'center', justifyContent: 'center' },
  char: { ...typography.h3 },
  liveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
});

// ─── AppBar ────────────────────────────────────────────────────────────────────

function TripDetailAppBar({
  title,
  onBack,
  powerSave,
  onToggleMode,
}: {
  title: string;
  onBack: () => void;
  powerSave: boolean;
  onToggleMode: () => void;
}) {
  const { colors } = useTheme();  // Option B — sub-component owns its theme
  return (
    <View style={[appBarStaticStyles.bar, { backgroundColor: colors.primary }]}>
      <TouchableOpacity
        style={appBarStaticStyles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[appBarStaticStyles.backBtnText, { color: colors.textInverse }]}>‹</Text>
      </TouchableOpacity>
      <Text style={[appBarStaticStyles.title, { color: colors.textInverse }]} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity
        style={[
          appBarStaticStyles.modeToggle,
          powerSave ? appBarStaticStyles.modeToggleSaver : appBarStaticStyles.modeToggleDefault,
        ]}
        onPress={onToggleMode}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[
          appBarStaticStyles.modeToggleText,
          powerSave ? appBarStaticStyles.modeToggleTextSaver : appBarStaticStyles.modeToggleTextDefault,
        ]}>
          ⚡ {powerSave ? 'ประหยัด' : 'ปกติ'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const appBarStaticStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    flex: 1,
  },
  modeToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  modeToggleDefault:     { backgroundColor: '#E1F5EE' },
  modeToggleSaver:       { backgroundColor: '#FAEEDA' },
  modeToggleText:        { fontSize: 11, fontWeight: '500' },
  modeToggleTextDefault: { color: '#0F6E56' },
  modeToggleTextSaver:   { color: '#854F0B' },
});

// ─── TripDetailScreen ──────────────────────────────────────────────────────────

export function TripDetailScreen() {
  const route = useRoute<TripDetailRouteProp>();
  const navigation = useNavigation<TripDetailNavProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;

  const { colors } = useTheme();
  const { powerSave, batteryLevel, togglePowerSave } = usePowerSaveMode();

  const [data, setData] = useState<TripData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

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
        <TripDetailAppBar
          title="รายละเอียดทริป"
          onBack={() => navigation.goBack()}
          powerSave={powerSave}
          onToggleMode={handleToggleMode}
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
        <TripDetailAppBar
          title="รายละเอียดทริป"
          onBack={() => navigation.goBack()}
          powerSave={powerSave}
          onToggleMode={handleToggleMode}
        />
        <View style={styles.centered}>
          <Text style={styles.mutedText}>กำลังโหลด...</Text>
        </View>
      </Screen>
    );
  }

  // Inline text-color helpers for hero card conditional styling
  const textOnHero: TextStyle     = { color: powerSave ? colors.textPrimary : colors.textInverse };
  const textOnHeroMuted: TextStyle = { color: powerSave ? colors.textSecondary : 'rgba(255,255,255,0.75)' };
  const textOnHeroSoft: TextStyle  = { color: powerSave ? colors.textSecondary : 'rgba(255,255,255,0.9)' };

  return (
    <Screen padded={false} style={styles.flex}>
      <TripDetailAppBar
        title={data.trip.name}
        onBack={() => navigation.goBack()}
        powerSave={powerSave}
        onToggleMode={handleToggleMode}
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
        {/* Hero card */}
        <View style={[styles.heroCard, powerSave && styles.heroCardSaver]}>
          <Text style={[styles.heroDate, textOnHeroMuted]}>{formatDate(data.trip.createdAt)}</Text>
          {data.trip.destination != null && (
            <Text style={[styles.heroDestination, textOnHeroSoft]}>
              📍 {data.trip.destination.name}
            </Text>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, textOnHero]}>
                {isEmpty || data.trip.totalDistanceKm == null
                  ? '—'
                  : data.trip.totalDistanceKm.toFixed(1)}
              </Text>
              <Text style={[styles.heroStatUnit, textOnHeroMuted]}>กม.</Text>
            </View>
            <View style={[styles.heroStatDivider, powerSave && styles.heroStatDividerSaver]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, textOnHero]}>
                {isEmpty ? 'เพิ่งเริ่ม' : formatDuration(data.trip.durationSeconds)}
              </Text>
            </View>
          </View>

          {isArchived ? (
            <View style={[styles.badge, powerSave ? styles.badgeArchivedSaver : styles.badgeArchived]}>
              <Text style={[styles.badgeText, powerSave ? styles.badgeTextSaverMuted : styles.badgeTextMuted]}>
                จบแล้ว
              </Text>
            </View>
          ) : isEmpty ? (
            <View style={[styles.badge, powerSave ? styles.badgeWaitingSaver : styles.badgeWaiting]}>
              <View style={[styles.pulseDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.badgeText, powerSave && styles.badgeTextSaver]}>รอข้อมูล</Text>
            </View>
          ) : (
            <View style={[styles.badge, powerSave ? styles.badgeActiveSaver : styles.badgeActive]}>
              <View style={[styles.pulseDot, { backgroundColor: powerSave ? colors.primary : '#34D399' }]} />
              <Text style={[styles.badgeText, powerSave && styles.badgeTextSaver]}>กำลังเดินทาง</Text>
            </View>
          )}
        </View>

        {/* Mini-map: default mode only — real Leaflet (Phase 6.1A component) */}
        {!powerSave && (
          <LeafletMapView
            data={{
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
                ? {
                    lat: data.trip.destination.lat,
                    lng: data.trip.destination.lng,
                    name: data.trip.destination.name,
                  }
                : undefined,
            }}
            style={{ height: 180, marginVertical: spacing.md, borderRadius: radius.md }}
          />
        )}

        {/* CTA banner — empty + default mode only */}
        {isEmpty && !powerSave && (
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerText}>
              ยังไม่มีใครแชร์ตำแหน่ง — กด "📍 เริ่มแชร์ตำแหน่ง" ด้านล่างเพื่อเริ่ม
            </Text>
          </View>
        )}

        {/* Update bar — mode-aware message */}
        {(powerSave || (!isEmpty && lastUpdated != null)) && (
          <View style={[styles.lastUpdatedBar, powerSave && styles.lastUpdatedBarSaver]}>
            {!powerSave && <View style={styles.liveDotInline} />}
            <Text style={[styles.lastUpdatedText, powerSave && styles.lastUpdatedTextSaver]}>
              {powerSave
                ? `🔋 โหมดประหยัด${batteryLevel !== null ? ` (${Math.round(batteryLevel * 100)}%)` : ''} · pull-to-refresh เท่านั้น`
                : `อัพเดต ${lastUpdated} · auto-refresh ทุก 60 วินาที`}
            </Text>
          </View>
        )}

        {/* Members section */}
        <Text style={styles.sectionTitle}>สมาชิก ({data.members.length})</Text>

        {/* Phase 6.5 — arrival summary (parent-owned, above the member list) */}
        {data.members.length > 0 && (() => {
          const arrivedCount = data.members.filter(m => m.arrivedAt).length;
          const totalCount = data.members.length;
          const summaryText = arrivedCount === totalCount
            ? `✅ ทุกคนถึงจุดหมายแล้ว (${totalCount})`
            : `🚗 ถึงแล้ว ${arrivedCount}/${totalCount} · ยังไม่ถึง ${totalCount - arrivedCount}`;
          return arrivedCount > 0
            ? <Text style={styles.arrivalSummary}>{summaryText}</Text>
            : null;
        })()}

        {powerSave ? (
          // Saver mode: vertical card list
          // TODO(Phase 5.5+): sort by battery low→high when other members' battery is available
          <View>
            {data.members.map(m => {
              const isMe = m.lineUserId === user?.lineUserId;
              const memberBattery = isMe && batteryLevel !== null
                ? Math.round(batteryLevel * 100)
                : null;
              return (
                <View key={m.id} style={styles.memberCardSaver}>
                  <View style={styles.memberCardSaverTop}>
                    <Avatar member={m} size={40} />
                    <View style={styles.memberCardSaverInfo}>
                      <Text style={styles.memberSaverName} numberOfLines={1}>
                        {m.displayName}
                        {m.isLeader && (
                          <Text style={styles.memberSaverLeader}> ★ หัวหน้า</Text>
                        )}
                      </Text>
                    </View>
                    {memberBattery !== null && (
                      <Text style={[styles.batteryText, { color: getBatteryColor(memberBattery) }]}>
                        {memberBattery}%
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberStatsRow}>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillText}>
                        📍 {m.lastLocation?.distanceFromLeaderKm != null
                          ? `${m.lastLocation.distanceFromLeaderKm.toFixed(1)} กม.`
                          : '—'}
                      </Text>
                    </View>
                    {m.lastLocation && (
                      <View style={styles.statPill}>
                        <Text style={styles.statPillText}>
                          🕐 {formatRelativeTime(m.lastLocation.createdAt)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.statPill}>
                      <Text style={styles.statPillText}>{memberStatusLabel(m)}</Text>
                    </View>
                    {m.arrivedAt && (
                      <View style={styles.statPill}>
                        <Text style={[styles.statPillText, styles.arrivedBadge]}>
                          ✅ ถึงเมื่อ {fmtTimeHHMM(m.arrivedAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Default mode: horizontal compact scroll with LivePulseDot for recent members
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersRow}
          >
            {data.members.map(member => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatarWrap}>
                  <Avatar member={member} />
                  {member.lastLocation && isRecent(member.lastLocation.createdAt) && (
                    <LivePulseDot color={colors.live} size={5} style={styles.memberLivePulse} />
                  )}
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{member.displayName}</Text>
                <Text
                  style={[
                    styles.memberStatus,
                    memberStatusLabel(member) === 'ออฟไลน์' && styles.memberStatusOffline,
                  ]}
                >
                  {memberStatusLabel(member)}
                </Text>
                {member.arrivedAt && (
                  <Text style={styles.arrivedBadge} numberOfLines={1}>
                    ✅ {fmtTimeHHMM(member.arrivedAt)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky action buttons — Q9: hidden for archived */}
      {!isArchived && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {isEmpty ? (
            <Button label="📍 เริ่มแชร์ตำแหน่ง" fullWidth onPress={handleShareLocation} />
          ) : isSharing ? (
            <Button label="กำลังแชร์อยู่" fullWidth disabled />
          ) : (
            <Button label="แชร์ตำแหน่ง" fullWidth onPress={handleShareLocation} />
          )}
          {callerMember?.isLeader && (
            <Button
              label="👥 เชิญเพื่อน"
              variant="secondary"
              fullWidth
              onPress={() => setShowInvite(true)}
              style={{ marginTop: spacing.sm }}
            />
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
      backgroundColor: c.backgroundAlt,
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

    // Hero card
    heroCard: {
      backgroundColor: c.primary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    heroCardSaver: {
      backgroundColor: c.backgroundAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    heroDate: {
      ...typography.caption,
      marginBottom: spacing.xs,
    },
    heroDestination: {
      ...typography.bodySmall,
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
    heroStatValue: { ...typography.h2 },
    heroStatUnit:  { ...typography.body },
    heroStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    heroStatDividerSaver: {
      backgroundColor: c.border,
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
    badgeActive:        { backgroundColor: 'rgba(52,211,153,0.25)' },
    badgeWaiting:       { backgroundColor: 'rgba(232,155,35,0.25)' },
    badgeArchived:      { backgroundColor: 'rgba(255,255,255,0.12)' },
    badgeActiveSaver:   { backgroundColor: '#E1F5EE' },
    badgeWaitingSaver:  { backgroundColor: '#FEF3C7' },
    badgeArchivedSaver: { backgroundColor: c.gray200 },
    badgeText: {
      ...typography.caption,
      color: c.textInverse,
      fontWeight: '600',
    },
    badgeTextMuted:     { color: 'rgba(255,255,255,0.65)' },
    badgeTextSaver:     { color: c.textPrimary },
    badgeTextSaverMuted:{ color: c.textSecondary },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: '#34D399',
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

    // Last-updated bar
    lastUpdatedBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    lastUpdatedBarSaver: {
      backgroundColor: c.accentWine,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginHorizontal: 0,
    },
    liveDotInline: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: c.live,
    },
    lastUpdatedText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    lastUpdatedTextSaver: {
      color: '#854F0B',
    },

    // Section header
    sectionTitle: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },

    // Phase 6.5 — arrival summary + per-member badge
    arrivalSummary: {
      ...typography.body,
      color: c.textPrimary,
      fontWeight: '600',
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      marginBottom: spacing.md,
    },
    arrivedBadge: {
      ...typography.caption,
      color: '#10B981',
      fontWeight: '600',
      marginTop: 2,
    },

    // Default members: horizontal compact scroll
    membersRow: {
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    memberCard: {
      width: 72,
      alignItems: 'center',
      gap: spacing.xs,
    },
    memberAvatarWrap: { position: 'relative' },
    memberLivePulse: {
      position: 'absolute',
      top: -2,
      right: -2,
    },
    memberName: {
      ...typography.caption,
      color: c.textPrimary,
      textAlign: 'center',
      width: 72,
    },
    memberStatus: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: 11,
    },
    memberStatusOffline: { color: c.gray500 },

    // Saver mode: vertical card list
    memberCardSaver: {
      backgroundColor: c.gray100,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    memberCardSaverTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    memberCardSaverInfo: { flex: 1 },
    memberSaverName: {
      ...typography.body,
      color: c.textPrimary,
      fontWeight: '500',
    },
    memberSaverLeader: {
      ...typography.caption,
      color: c.warning,
      fontWeight: '600',
    },
    memberStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    statPill: {
      backgroundColor: c.surface,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    statPillText: {
      ...typography.caption,
      color: c.textSecondary,
      fontSize: 11,
    },
    batteryText: {
      ...typography.caption,
      fontWeight: '500',
    },

    // Action bar
    actionBar: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
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
