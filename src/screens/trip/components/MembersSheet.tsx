// src/screens/trip/components/MembersSheet.tsx
// Bottom-sheet list of trip members, opened from the action bar "สมาชิก (N)" button.
// Header: member count + a single header-RIGHT "เชิญ" (leader-only) that reuses the
// existing InviteMembersModal (the screen swaps sheet → invite modal). NO per-row
// invite button, NO FAB. Rows reuse MemberRow (avatar + name (+you) + last-updated
// + leader badge) and are non-interactive (no recenter chevron behind the sheet).

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MemberRow } from './MemberRow';
import { Member } from '../tripShared';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface MembersSheetProps {
  visible: boolean;
  members: Member[];
  selfLineUserId?: string;
  onInvite?: () => void;   // leader-only — header-RIGHT เชิญ → opens InviteMembersModal
  onClose: () => void;
}

export function MembersSheet({ visible, members, selfLineUserId, onInvite, onClose }: MembersSheetProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tap the dimmed backdrop to close; the sheet captures its own taps. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Header: count + header-RIGHT เชิญ (leader-only) */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('trip.members.count', { count: members.length })}</Text>
            {onInvite != null && (
              <Pressable onPress={onInvite} hitSlop={8} accessibilityRole="button">
                <Text style={styles.inviteLink}>{t('trip.invite')}</Text>
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {members.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <View style={styles.divider} />}
                <MemberRow member={m} isSelf={m.lineUserId === selfLineUserId} />
              </View>
            ))}
          </ScrollView>

          <Button
            label={t('common.close')}
            variant="ghost"
            fullWidth
            onPress={onClose}
            style={{ marginTop: spacing.sm }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.h3,
      color: c.textPrimary,
    },
    inviteLink: {
      ...typography.button,
      color: c.primary,
    },
    list: {
      // Bounded by the sheet's maxHeight; scrolls when members overflow.
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
  });
}
