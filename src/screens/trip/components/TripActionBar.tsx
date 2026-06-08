// src/screens/trip/components/TripActionBar.tsx
// Sticky bottom action bar: [แชร์ตำแหน่ง primary] · [เชิญ secondary] · [จบ red].
// Wiring/guards are owned by the screen and passed in unchanged:
//   • share → handleShareLocation (isSharing → disabled "กำลังแชร์")
//   • เชิญ  → setShowInvite (leader-only via canInvite)
//   • จบ    → handleEndTrip (danger; disabled unless canStop)

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme';
import type { Palette } from '@/theme';

export interface TripActionBarProps {
  isSharing: boolean;
  canInvite: boolean;        // leader-only
  canStop: boolean;
  bottomInset: number;       // safe-area padding for the bar
  onShareLocation: () => void;
  onInvite: () => void;
  onEndTrip: () => void;
}

export function TripActionBar({
  isSharing,
  canInvite,
  canStop,
  bottomInset,
  onShareLocation,
  onInvite,
  onEndTrip,
}: TripActionBarProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]}>
      <View style={styles.row}>
        {/* Share location — primary, widest */}
        {isSharing ? (
          <Button label="📍 กำลังแชร์" disabled style={{ ...styles.btn, flex: 2 }} />
        ) : (
          <Button
            label="📍 แชร์ตำแหน่ง"
            onPress={onShareLocation}
            style={{ ...styles.btn, flex: 2 }}
          />
        )}

        {/* Invite — secondary, leader only */}
        {canInvite && (
          <Button
            label="เชิญ"
            variant="secondary"
            onPress={onInvite}
            style={{ ...styles.btn, flex: 1 }}
          />
        )}

        {/* End trip — danger (red); disabled unless leader & active */}
        <Button
          label="⊗ จบ"
          variant={canStop ? 'danger' : 'secondary'}
          disabled={!canStop}
          onPress={onEndTrip}
          style={{ ...styles.btn, flex: 1 }}
        />
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
