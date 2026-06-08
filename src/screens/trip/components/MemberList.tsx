// src/screens/trip/components/MemberList.tsx
// Members card: header "สมาชิก N" + "เชิญ" link → member rows (divided) →
// bottom "เพิ่มสมาชิก" row. `เชิญ`/`เพิ่มสมาชิก` are leader-only (rendered only
// when `onInvite` is provided) and both open the existing InviteMembersModal.
// `summary` carries the Phase 6.5 arrival line.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MemberRow } from './MemberRow';
import { Member } from '../tripShared';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface MemberListProps {
  members: Member[];
  selfLineUserId?: string;
  summary?: string | null;       // arrival summary line (null/empty → hidden)
  onInvite?: () => void;         // leader-only: เชิญ link + เพิ่มสมาชิก row
  onMemberPress?: (member: Member) => void;   // tap → recenter map (only members with a location)
}

export function MemberList({ members, selfLineUserId, summary, onInvite, onMemberPress }: MemberListProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>สมาชิก {members.length}</Text>
        {onInvite != null && (
          <Pressable onPress={onInvite} hitSlop={8} accessibilityRole="button">
            <Text style={styles.inviteLink}>เชิญ</Text>
          </Pressable>
        )}
      </View>

      {summary != null && summary.length > 0 && (
        <Text style={styles.summary}>{summary}</Text>
      )}

      {/* Rows */}
      {members.map((m, i) => (
        <View key={m.id}>
          {i > 0 && <View style={styles.divider} />}
          <MemberRow
            member={m}
            isSelf={m.lineUserId === selfLineUserId}
            onPress={m.lastLocation && onMemberPress ? () => onMemberPress(m) : undefined}
          />
        </View>
      ))}

      {/* Add member (leader-only) */}
      {onInvite != null && (
        <>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.6 }]}
            onPress={onInvite}
            accessibilityRole="button"
          >
            <Text style={styles.addIcon}>＋</Text>
            <Text style={styles.addText}>เพิ่มสมาชิก</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    headerTitle: {
      ...typography.body,
      fontWeight: '700',
      color: c.textPrimary,
    },
    inviteLink: {
      ...typography.button,
      color: c.primary,
    },
    summary: {
      ...typography.caption,
      color: c.textSecondary,
      paddingBottom: spacing.xs,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    addIcon: {
      fontSize: 18,
      color: c.primary,
      fontWeight: '700',
      width: 40,            // align with avatar column
      textAlign: 'center',
    },
    addText: {
      ...typography.body,
      color: c.primary,
      fontWeight: '600',
    },
  });
}
