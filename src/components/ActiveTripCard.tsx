// src/components/ActiveTripCard.tsx
// Phase 6.2.5 — clickable card on HomeScreen that opens MapScreen for an
// in-progress trip. One card per active trip (multi-active supported).

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface ActiveTripCardProps {
  tripId: string;
  name: string;
  memberCount?: number;
  lastUpdateText?: string;     // pre-formatted, e.g. "อัปเดต 2 นาทีที่แล้ว"
  onPress: () => void;
}

export function ActiveTripCard({
  tripId, name, memberCount, lastUpdateText, onPress,
}: ActiveTripCardProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`เปิดทริปกำลังทำงาน: ${name}`}
    >
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🚗</Text>
        <Text style={styles.headerLabel}>ทริปกำลังทำงาน</Text>
      </View>

      <Text style={styles.tripName} numberOfLines={1}>
        {name}
      </Text>

      <View style={styles.metaRow}>
        {typeof memberCount === 'number' && (
          <Text style={styles.metaText}>👥 {memberCount} สมาชิก</Text>
        )}
        {lastUpdateText && (
          <Text style={styles.metaText}>🟢 {lastUpdateText}</Text>
        )}
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>เปิดทริป →</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    cardPressed: {
      opacity: 0.7,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    headerEmoji: {
      fontSize: 18,
      marginRight: 6,
    },
    headerLabel: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
    },
    tripName: {
      ...typography.h3,
      color: c.textPrimary,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    metaText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    cta: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      marginTop: spacing.xs,
    },
    ctaText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
