// src/screens/settings/SettingsScreen.tsx

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePowerSaveMode } from '@/hooks/usePowerSaveMode';
import { typography, spacing, radius } from '@/theme';
import type { Palette } from '@/theme';

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: Palette }) {
  return (
    <Text style={[staticStyles.sectionTitle, { color: colors.textSecondary }]}>
      {title}
    </Text>
  );
}

interface SettingsRowProps {
  icon: string;
  label: string;
  sub?: string;
  value?: string;
  rightControl?: React.ReactNode;
  showChevron?: boolean;
  isSignOut?: boolean;
  onPress?: () => void;
  colors: Palette;
}

function SettingsRow({
  icon, label, sub, value, rightControl,
  showChevron, isSignOut, onPress, colors,
}: SettingsRowProps) {
  const labelColor = isSignOut ? colors.danger : colors.textPrimary;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.6 : 1} disabled={!onPress}>
      <View style={[staticStyles.row, { borderTopColor: colors.border }]}>
        <Text style={[staticStyles.rowIcon, { color: labelColor }]}>{icon}</Text>
        <View style={staticStyles.rowBody}>
          <Text style={[staticStyles.rowLabel, { color: labelColor }]}>{label}</Text>
          {sub != null && (
            <Text style={[staticStyles.rowSub, { color: colors.textSecondary }]}>{sub}</Text>
          )}
        </View>
        {value != null && (
          <Text style={[staticStyles.rowValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
        {rightControl}
        {showChevron === true && (
          <Text style={[staticStyles.chevron, { color: isSignOut ? colors.danger : colors.textSecondary }]}>
            ›
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface PowerSaveRowProps {
  active: boolean;
  onToggle: (next: boolean) => void;
  colors: Palette;
  isDark: boolean;
}

function PowerSaveRow({ active, onToggle, colors, isDark }: PowerSaveRowProps) {
  // accentWine resolves to amber (#FFE9C7) in light, deep wine (#390507) in dark
  const bg = active ? colors.accentWine : (isDark ? '#3F2F0E' : '#FEF3E7');
  return (
    <View style={[staticStyles.row, staticStyles.rowPowerSave, { backgroundColor: bg, borderTopColor: colors.border }]}>
      <Text style={[staticStyles.rowIcon, { color: colors.warning, fontSize: 22 }]}>🔋</Text>
      <View style={staticStyles.rowBody}>
        <View style={staticStyles.powerLabelRow}>
          <Text style={[staticStyles.rowLabel, { color: colors.textPrimary }]}>
            โหมดประหยัดพลังงาน
          </Text>
          {active && (
            <View style={staticStyles.powerBadge}>
              <Text style={staticStyles.powerBadgeText}>เปิดอยู่</Text>
            </View>
          )}
        </View>
        <Text style={[staticStyles.rowSub, { color: colors.textSecondary }]}>
          ลดการใช้แบตในทริปยาว · POST ทุก 30 วินาที
        </Text>
      </View>
      <Switch
        value={active}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: colors.warning }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ─── SettingsScreen ────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { pref, setDarkModePref } = useDarkMode();
  const { powerSave, togglePowerSave } = usePowerSaveMode();
  const { user, signOut } = useAuth();

  const styles = makeStyles(colors);

  // Dark mode Switch: 'dark' = on, 'auto' = off (follow device)
  const darkOn = pref === 'dark';
  function handleDarkToggle(next: boolean) {
    setDarkModePref(next ? 'dark' : 'auto');
  }

  return (
    <Screen padded={false} style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>จัดการการตั้งค่าของคุณ</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLetter}>
              {(user?.displayName ?? 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName}>{user?.displayName ?? 'Guest'}</Text>
            <View style={styles.profileStatusRow}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>★ Premium</Text>
              </View>
              <Text style={styles.profileStatusText}>· พร้อมทริป</Text>
            </View>
          </View>
        </View>

        {/* Section: บัญชี */}
        <SectionTitle title="บัญชี" colors={colors} />
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="👤"
            label="โปรไฟล์"
            value={user?.displayName ?? '—'}
            showChevron
            colors={colors}
            onPress={() => {}}
          />
          <SettingsRow
            icon="📱"
            label="อุปกรณ์ที่เชื่อมต่อ"
            value="1 เครื่อง"
            showChevron
            colors={colors}
            onPress={() => {}}
          />
          <SettingsRow
            icon="🔔"
            label="การแจ้งเตือน"
            value="เปิดอยู่"
            showChevron
            colors={colors}
            onPress={() => {}}
          />
        </View>

        {/* Section: ตั้งค่า */}
        <SectionTitle title="ตั้งค่า" colors={colors} />
        <View style={styles.sectionCard}>
          <PowerSaveRow
            active={powerSave}
            onToggle={togglePowerSave}
            colors={colors}
            isDark={isDark}
          />
          <SettingsRow
            icon="🌙"
            label="โหมดมืด"
            sub="ตามระบบ · ลด OLED battery"
            rightControl={
              <Switch
                value={darkOn}
                onValueChange={handleDarkToggle}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor="#fff"
              />
            }
            colors={colors}
          />
          <SettingsRow
            icon="🛡️"
            label="ความเป็นส่วนตัว"
            value="จัดการ"
            showChevron
            colors={colors}
            onPress={() => {}}
          />
        </View>

        {/* Section: ช่วยเหลือ */}
        <SectionTitle title="ช่วยเหลือ" colors={colors} />
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="❓"
            label="ช่วยเหลือ & FAQ"
            showChevron
            colors={colors}
            onPress={() => {}}
          />
          <SettingsRow
            icon="↪"
            label="ออกจากระบบ"
            isSignOut
            showChevron
            colors={colors}
            onPress={signOut}
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Static styles (layout/spacing — theme-independent) ───────────────────────

const staticStyles = StyleSheet.create({
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowPowerSave: {
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  rowIcon: {
    fontSize: 17,
    width: 24,
    textAlign: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: {
    ...typography.body,
    fontSize: 14,
  },
  rowSub: {
    ...typography.caption,
    marginTop: 1,
    fontSize: 11,
  },
  rowValue: {
    ...typography.caption,
    fontSize: 12,
    marginRight: spacing.xs,
  },
  chevron: { fontSize: 20 },
  powerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  powerBadge: {
    backgroundColor: '#E89B23',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  powerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
});

// ─── Theme-aware styles factory ────────────────────────────────────────────────

function makeStyles(c: Palette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    header: {
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.h1,
      color: c.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      ...typography.bodySmall,
      color: c.textSecondary,
    },
    profileCard: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatarLarge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarLetter: {
      color: '#fff',
      fontSize: 19,
      fontWeight: '500',
    },
    profileTextWrap: { flex: 1 },
    profileName: {
      ...typography.body,
      color: c.textPrimary,
      fontWeight: '500',
    },
    profileStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 3,
    },
    premiumBadge: {
      backgroundColor: c.warning,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    premiumBadgeText: {
      ...typography.caption,
      color: '#fff',
      fontSize: 10,
    },
    profileStatusText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    sectionCard: {
      marginHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
  });
}
