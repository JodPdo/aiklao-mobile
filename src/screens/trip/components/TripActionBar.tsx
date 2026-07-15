// src/screens/trip/components/TripActionBar.tsx
// Sticky bottom action bar (B1-1 IA, 2026-07-15): [แชร์ตำแหน่ง toggle] · [สมาชิก (N)] · [เพิ่มเติม ⋯ leader-only].
// Invite + End-trip moved into TripMoreActionsSheet (opened via onMore) — infrequent, leader-only
// actions no longer compete for primary-row space against the safety-critical share toggle.
// SOS is deliberately NOT here — it already lives as a floating button over the map
// (TripMapView.tsx), which satisfies "never behind a menu" better than a bar slot would.
//
// Wiring/guards owned by the screen and passed in:
//   • share toggle → onToggleSharing (screen owns the actual start/stop + loading state)
//   • members      → opens the MembersSheet
//   • เพิ่มเติม    → onMore (omit the prop entirely to hide the button — leader-only for now,
//                    since a member's sheet would be empty until Leave Trip/Break ship)

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { LivePulseDot } from '@/components/LivePulseDot';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme';
import type { Palette } from '@/theme';

export interface TripActionBarProps {
  memberCount: number;
  isSharing: boolean;
  sharingLoading: boolean;
  onToggleSharing: () => void;
  bottomInset: number;       // safe-area padding for the bar
  onMembers: () => void;
  onMore?: () => void;       // omit to hide the button entirely (non-leader, for now)
}

export function TripActionBar({
  memberCount,
  isSharing,
  sharingLoading,
  onToggleSharing,
  bottomInset,
  onMembers,
  onMore,
}: TripActionBarProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]}>
      <View style={styles.row}>
        {/* Share-location toggle — always visible, every role. Never behind a menu:
            this single button both starts and stops sharing (pressing while ON stops it). */}
        <Button
          label={isSharing ? t('trip.sharing.on') : t('trip.sharing.off')}
          variant={isSharing ? 'live' : 'secondary'}
          loading={sharingLoading}
          icon={isSharing && !sharingLoading ? <LivePulseDot color={colors.white} size={6} /> : undefined}
          onPress={onToggleSharing}
          style={{ ...styles.btn, flex: 1 }}
        />

        {/* Members — opens the members sheet; kept as the widest/most prominent button,
            unchanged from the pre-redesign bar (checking on the group is the core value loop) */}
        <Button
          label={t('trip.members.count', { count: memberCount })}
          onPress={onMembers}
          style={{ ...styles.btn, flex: 2 }}
        />

        {/* More — leader-only for now (see file header); opens TripMoreActionsSheet */}
        {onMore != null && (
          <Button
            label={t('trip.more')}
            variant="secondary"
            onPress={onMore}
            style={{ ...styles.btn, flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    bar: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    btn: {
      // Buttons sit in a flex row; clear the default fullWidth stretch.
      alignSelf: 'auto',
    },
  });
}
