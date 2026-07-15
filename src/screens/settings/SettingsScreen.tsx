// src/screens/settings/SettingsScreen.tsx

import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { t } from '@/i18n';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
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
            {t('settings.powerSave.label')}
          </Text>
          {active && (
            <View style={[staticStyles.powerBadge, { backgroundColor: colors.warning }]}>
              <Text style={[staticStyles.powerBadgeText, { color: colors.white }]}>{t('settings.on')}</Text>
            </View>
          )}
        </View>
        <Text style={[staticStyles.rowSub, { color: colors.textSecondary }]}>
          {t('settings.powerSave.sub')}
        </Text>
      </View>
      <Switch
        value={active}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.warning }}
        thumbColor={colors.white}
      />
    </View>
  );
}

// ─── SettingsScreen ────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const { colors, isDark, setDarkMode } = useTheme();
  const { powerSave, togglePowerSave } = usePowerSaveMode();
  const { user, signOut } = useAuth();

  const styles = makeStyles(colors);

  // Profile avatar: LINE picture with initial-letter fallback. The fallback letter
  // is derived from the SAME resolved name shown below (so a guest's avatar + name
  // come from one source — resolves the STEP-2c 'G'-vs-ผู้เยือน mismatch).
  const displayName = user?.displayName?.trim() || t('settings.guest');
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatarImage = !!user?.pictureUrl && !avatarFailed;

  // Dark mode Switch: 'dark' = on, 'auto' = off (follow device)
  const darkOn = isDark;  // reflects resolved state, not just pref (avoids 'auto' ambiguity)
  function handleDarkToggle(next: boolean) {
    setDarkMode(next);
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
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          {showAvatarImage ? (
            <Image
              source={{ uri: user!.pictureUrl! }}
              style={styles.avatarImage}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.profileStatusRow}>
              <Text style={styles.profileStatusText}>{t('settings.statusReady')}</Text>
            </View>
          </View>
        </View>

        {/* Section: Account */}
        <SectionTitle title={t('settings.section.account')} colors={colors} />
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="👤"
            label={t('settings.profile')}
            value={user?.displayName ?? '—'}
            colors={colors}
          />
          <SettingsRow
            icon="📱"
            label={t('settings.connectedDevices')}
            value={t('settings.deviceCount', { count: 1 })}
            colors={colors}
          />
          <SettingsRow
            icon="🔔"
            label={t('settings.notifications')}
            value={t('settings.on')}
            colors={colors}
          />
        </View>

        {/* Section: Preferences */}
        <SectionTitle title={t('settings.section.preferences')} colors={colors} />
        <View style={styles.sectionCard}>
          <PowerSaveRow
            active={powerSave}
            onToggle={togglePowerSave}
            colors={colors}
            isDark={isDark}
          />
          <SettingsRow
            icon="🌙"
            label={t('settings.darkMode.label')}
            sub={t('settings.darkMode.sub')}
            rightControl={
              <Switch
                value={darkOn}
                onValueChange={handleDarkToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
            colors={colors}
          />
          <SettingsRow
            icon="🛡️"
            label={t('settings.privacy')}
            value={t('settings.manage')}
            colors={colors}
          />
        </View>

        {/* Section: Help */}
        <SectionTitle title={t('settings.section.help')} colors={colors} />
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="❓"
            label={t('settings.helpFaq')}
            colors={colors}
          />
          <SettingsRow
            icon="↪"
            label={t('settings.signOut')}
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
  // Color applied inline where used (needs colors.warning/colors.white — this block is
  // theme-independent layout only, see file header comment).
  powerBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  powerBadgeText: {
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
    avatarImage: {
      width: 52,
      height: 52,
      borderRadius: 26,    // circular LINE profile picture
    },
    avatarLetter: {
      color: c.white,
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
