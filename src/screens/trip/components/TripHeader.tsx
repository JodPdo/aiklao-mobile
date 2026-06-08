// src/screens/trip/components/TripHeader.tsx
// White trip header (replaces the green TripDetailAppBar):
//   ← back · trip name + status pill (derived from trip.status) · ⚡ power-save
//   toggle (relocated, real wiring preserved) · แชร์.  Subline = start date/time.
//
// Theme-only colors (the danger red is not used here). Status label + pill colors
// are data-driven from `status`/`isWaiting` — never hardcode the active label.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';
import { formatDate } from '../tripShared';

export interface TripHeaderProps {
  tripName: string;
  onBack: () => void;
  powerSave: boolean;
  onTogglePowerSave: () => void;
  // Optional — omitted in the loading / error states (no trip data yet)
  status?: 'active' | 'archived';
  isWaiting?: boolean;        // active but no member has shared location yet → "รอข้อมูล"
  startedAtIso?: string;      // trip.createdAt → "8 มิ.ย. 2026 · เริ่ม 09:04"
  onShare?: () => void;
}

// Maps trip.status (+ waiting) → pill label and theme color keys. Data-driven:
// active, waiting, and archived all render distinctly; nothing is hardcoded.
function pillStyle(c: Palette, status: 'active' | 'archived', isWaiting: boolean) {
  if (status === 'archived') {
    return { label: 'จบแล้ว', dot: c.gray500, bg: c.gray200, text: c.textSecondary };
  }
  if (isWaiting) {
    return { label: 'รอข้อมูล', dot: c.warning, bg: c.accentWine, text: c.warning };
  }
  return { label: 'กำลังเดินทาง', dot: c.live, bg: c.accentMint, text: c.success };
}

export function TripHeader({
  tripName,
  onBack,
  powerSave,
  onTogglePowerSave,
  status,
  isWaiting = false,
  startedAtIso,
  onShare,
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
          accessibilityLabel="ย้อนกลับ"
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

        <View style={styles.actions}>
          <Pressable
            style={[styles.iconBtn, powerSave ? styles.iconBtnActive : styles.iconBtnIdle]}
            onPress={onTogglePowerSave}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="switch"
            accessibilityState={{ checked: powerSave }}
            accessibilityLabel={powerSave ? 'โหมดประหยัดแบตเตอรี่ (เปิดอยู่)' : 'โหมดประหยัดแบตเตอรี่ (ปิดอยู่)'}
          >
            <Text style={[styles.iconBtnText, { color: powerSave ? colors.warning : colors.textSecondary }]}>⚡</Text>
          </Pressable>

          {onShare != null && (
            <Pressable
              style={styles.shareBtn}
              onPress={onShare}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="แชร์ทริป"
            >
              <Text style={styles.shareText}>แชร์</Text>
            </Pressable>
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
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnIdle: { backgroundColor: c.gray100 },
    iconBtnActive: { backgroundColor: c.accentWine },
    iconBtnText: {
      fontSize: 15,
    },
    shareBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    shareText: {
      ...typography.button,
      color: c.primary,
    },
    subline: {
      ...typography.caption,
      color: c.textSecondary,
      marginLeft: 32 + spacing.sm,  // align under the title, past the back button
    },
  });
}
