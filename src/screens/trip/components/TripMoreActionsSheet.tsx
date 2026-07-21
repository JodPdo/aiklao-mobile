// src/screens/trip/components/TripMoreActionsSheet.tsx
// Overflow sheet for infrequent trip actions (B1-1 IA, 2026-07-15).
// Structurally cloned from MembersSheet.tsx's Modal/backdrop/sheet skeleton — same
// pattern, different content (a short action list instead of a member list).
//
// Role-gated by which handler props are supplied — each prop is optional, and
// its row only renders when the prop is provided:
//   • onInvite / onEndTrip — leader-only (the screen only passes these for the
//     trip leader; a member gets undefined for both).
//   • onLeaveTrip — non-leader (member) only, MB-5. The leader is never offered
//     this — they archive the trip instead (MB5_LEAVE_TRIP_DESIGN.md Q1).
// This sheet is no longer leader-only overall (was, until MB-5) — TripActionBar's
// "More" button is now always shown, and this sheet renders whichever rows apply
// to the caller's own role, so a member's sheet is never empty.

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface TripMoreActionsSheetProps {
  visible: boolean;
  onInvite?: () => void;
  onEndTrip?: () => void;
  onLeaveTrip?: () => void;
  onClose: () => void;
}

export function TripMoreActionsSheet({
  visible, onInvite, onEndTrip, onLeaveTrip, onClose,
}: TripMoreActionsSheetProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const rows: { key: string; label: string; onPress: () => void; danger?: boolean }[] = [];
  if (onInvite) rows.push({ key: 'invite', label: t('trip.invite'), onPress: onInvite });
  if (onEndTrip) rows.push({ key: 'end', label: t('trip.action.end'), onPress: onEndTrip, danger: true });
  if (onLeaveTrip) rows.push({ key: 'leave', label: t('trip.action.leave'), onPress: onLeaveTrip, danger: true });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t('trip.moreActions.title')}</Text>

          {rows.map((row, i) => (
            <React.Fragment key={row.key}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                style={styles.row}
                onPress={row.onPress}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>{row.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}

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
    },
    title: {
      ...typography.h3,
      color: c.textPrimary,
      marginBottom: spacing.xs,
    },
    row: {
      minHeight: 48,               // tap target ≥44pt
      justifyContent: 'center',
    },
    rowLabel: {
      ...typography.body,
      color: c.textPrimary,
    },
    rowLabelDanger: {
      color: c.danger,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
  });
}
