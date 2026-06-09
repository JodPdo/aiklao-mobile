// src/screens/trip/components/TripHeader.tsx
// White trip header: ← back · trip name + status pill (derived from trip.status).
// Subline = start date/time. (Power-save now lives in Settings; standalone share
// removed — invite-link sharing stays inside InviteMembersModal via เชิญ.)
//
// Theme-only colors. Status label + pill colors are data-driven from
// `status`/`isWaiting` — never hardcode the active label.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import { formatDate } from '../tripShared';

export interface TripHeaderProps {
  tripName: string;
  onBack: () => void;
  // Optional — omitted in the loading / error states (no trip data yet)
  status?: 'active' | 'archived';
  isWaiting?: boolean;        // active but no member has shared location yet → "รอข้อมูล"
  startedAtIso?: string;      // trip.createdAt → "8 มิ.ย. 2026 · เริ่ม 09:04"
}

// Maps trip.status (+ waiting) → pill label and theme color keys. Data-driven:
// active, waiting, and archived all render distinctly; nothing is hardcoded.
function pillStyle(c: Palette, status: 'active' | 'archived', isWaiting: boolean) {
  if (status === 'archived') {
    return { label: t('trip.status.archived'), dot: c.gray500, bg: c.gray200, text: c.textSecondary };
  }
  if (isWaiting) {
    return { label: t('trip.status.waiting'), dot: c.warning, bg: c.accentWine, text: c.warning };
  }
  return { label: t('trip.status.active'), dot: c.live, bg: c.accentMint, text: c.success };
}

export function TripHeader({
  tripName,
  onBack,
  status,
  isWaiting = false,
  startedAtIso,
}: TripHeaderProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const pill = status != null ? pillStyle(colors, status, isWaiting) : null;

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('trip.a11y.back')}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{tripName}</Text>
          {pill != null && (
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <View style={[styles.pillDot, { backgroundColor: pill.dot }]} />
              <Text style={[styles.pillText, { color: pill.text }]} numberOfLines={1}>
                {pill.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {startedAtIso != null && (
        <Text style={styles.subline}>{formatDate(startedAtIso)}</Text>
      )}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: spacing.xs,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 24,
      lineHeight: 28,
      color: c.textPrimary,
    },
    titleWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: c.textPrimary,
      flexShrink: 1,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    pillDot: {
      width: 7,
      height: 7,
      borderRadius: radius.pill,
    },
    pillText: {
      ...typography.caption,
      fontWeight: '600',
    },
    subline: {
      ...typography.caption,
      color: c.textSecondary,
      marginLeft: 32 + spacing.sm,  // align under the title, past the back button
    },
  });
}
