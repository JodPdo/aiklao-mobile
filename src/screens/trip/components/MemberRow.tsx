// src/screens/trip/components/MemberRow.tsx
// One member row inside the members card:
//   avatar · name (+ "(คุณ)") + "อัปเดตเมื่อ … ที่แล้ว" · หัวหน้า badge · ›
// Arrival is folded into the subtitle (✅ ถึงเมื่อ HH:MM) so the Phase 6.5 arrival
// info isn't lost in the unified layout. Row is interactive only when `onPress`
// is supplied (the › is otherwise a list affordance — see screen review note).

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Member, fmtTimeHHMM, formatRelativeTime } from '../tripShared';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface MemberRowProps {
  member: Member;
  isSelf?: boolean;
  onPress?: () => void;
}

export function MemberRow({ member, isSelf = false, onPress }: MemberRowProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const subtitle = member.arrivedAt
    ? `✅ ถึงเมื่อ ${fmtTimeHHMM(member.arrivedAt)}`
    : member.lastLocation
      ? `อัปเดตเมื่อ ${formatRelativeTime(member.lastLocation.createdAt)}`
      : 'ยังไม่ได้แชร์ตำแหน่ง';

  const inner = (
    <>
      <Avatar member={member} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {member.displayName}{isSelf ? ' (คุณ)' : ''}
        </Text>
        <Text
          style={[styles.subtitle, member.arrivedAt && styles.subtitleArrived]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      {member.isLeader && (
        <View style={styles.leaderBadge}>
          <Text style={styles.leaderText}>หัวหน้า</Text>
        </View>
      )}
      {/* Chevron only when tappable — nothing to center on without a location */}
      {onPress != null && <Text style={styles.chevron}>›</Text>}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.row}>{inner}</View>;
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    info: { flex: 1 },
    name: {
      ...typography.body,
      fontWeight: '600',
      color: c.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: 1,
    },
    subtitleArrived: {
      color: c.success,
      fontWeight: '600',
    },
    leaderBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: c.accentWine,
    },
    leaderText: {
      ...typography.caption,
      color: c.warning,
      fontWeight: '600',
    },
    chevron: {
      fontSize: 22,
      lineHeight: 22,
      color: c.gray400,
      marginLeft: spacing.xs,
    },
  });
}
