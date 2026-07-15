// src/screens/trip/components/TripMoreActionsSheet.tsx
// Overflow sheet for infrequent, leader-only trip actions (B1-1 IA, 2026-07-15).
// Structurally cloned from MembersSheet.tsx's Modal/backdrop/sheet skeleton — same
// pattern, different content (a short action list instead of a member list).
//
// Leader-only for now: rendered only when TripActionBar's onMore prop is supplied,
// which the screen only does for the trip leader. A non-leader's version of this
// sheet would be empty right now (Leave Trip / Break aren't backend-ready yet) —
// deliberately not shown rather than shipping a dead menu (see SettingsScreen's
// disabled-chevron rows, UX-11, which this project is already fixing elsewhere).
//
// Future rows land here as their tickets ship (Leave Trip / MB-5, Break / 5a, rename,
// change destination, share-link) — no bar redesign needed, just add a row and, once
// any of them is member-facing, stop gating the More button to leader-only.

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface TripMoreActionsSheetProps {
  visible: boolean;
  onInvite: () => void;
  onEndTrip: () => void;
  onClose: () => void;
}

export function TripMoreActionsSheet({ visible, onInvite, onEndTrip, onClose }: TripMoreActionsSheetProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t('trip.moreActions.title')}</Text>

          <Pressable
            style={styles.row}
            onPress={onInvite}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.rowLabel}>{t('trip.invite')}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.row}
            onPress={onEndTrip}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>{t('trip.action.end')}</Text>
          </Pressable>

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
