// src/screens/trip/components/TripMapView.tsx
// Fixed-height map block that sits directly under the TripHeader (~40% of screen).
// Wraps the reused LeafletMapView and adds RN overlays:
//   • "● LIVE" badge   top-right   (reuses LivePulseDot; shown when data is live)
//   • nav-arrow ➤      top-left    (opens external turn-by-turn to destination)
//   • recenter ◎       bottom-right (re-centers the map onto the user)
//   • SOS slot         bottom-left (RESERVED — see note; logic ported later)
// In power-save mode the WebView is skipped (battery) — a same-height static
// placeholder keeps the layout from jumping.

import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LeafletData, LeafletMapView } from '@/components/LeafletMapView';
import { LivePulseDot } from '@/components/LivePulseDot';
import { SosButton } from '@/components/SosButton';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export interface TripMapViewProps {
  data: LeafletData;
  height: number;
  powerSave: boolean;
  live: boolean;                                   // someone is actively sharing → LIVE badge
  destination?: { lat: number; lng: number; name: string } | null;  // nav-arrow target
  // Recenter is lifted to the screen so the ◎ button AND member-row taps drive a
  // single path. `recenterTo` is the current target; bump `recenterToken` to fire.
  recenterTo?: { lat: number; lng: number };
  recenterToken?: number;
  onRecenter?: () => void;                          // ◎ button (screen recenters to self)
  // SOS — accepted here so the screen can wire it; the <SosButton> is mounted in
  // the reserved bottom-left sosSlot in STEP 4. When omitted, the slot stays empty.
  activeSosId?: string | null;
  onSosPress?: () => void;
  onCancelSos?: (id: string) => void;
}

export function TripMapView({
  data,
  height,
  powerSave,
  live,
  destination,
  recenterTo,
  recenterToken,
  onRecenter,
  activeSosId,
  onSosPress,
  onCancelSos,
}: TripMapViewProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  async function openExternalNav() {
    if (!destination) return;
    const { lat, lng } = destination;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('เปิดแผนที่นำทางไม่ได้', 'ลองอีกครั้ง');
    }
  }

  if (powerSave) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>🔋 แผนที่ปิดอยู่ในโหมดประหยัดแบตเตอรี่</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <LeafletMapView
        data={data}
        style={styles.map}
        recenterTo={recenterTo}
        recenterToken={recenterToken}
      />

      {/* nav-arrow — top-left — external turn-by-turn (only when a destination is set) */}
      {destination != null && (
        <Pressable
          style={[styles.fab, styles.navArrow]}
          onPress={openExternalNav}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="นำทางไปจุดหมาย"
        >
          <Text style={styles.fabIcon}>➤</Text>
        </Pressable>
      )}

      {/* LIVE badge — top-right — reuses LivePulseDot */}
      {live && (
        <View style={styles.liveBadge}>
          <LivePulseDot color={colors.live} size={5} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {/* recenter ◎ — bottom-right — only when the screen can recenter (self known) */}
      {onRecenter != null && (
        <Pressable
          style={[styles.fab, styles.recenter]}
          onPress={onRecenter}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="กลับไปที่ตำแหน่งของฉัน"
        >
          <Text style={styles.fabIcon}>◎</Text>
        </Pressable>
      )}

      {/* SOS button — bottom-left. Mounted only when SOS is enabled (onSosPress
          provided; screen gates this off for archived trips). `box-none` so the
          slot never blocks map pan/zoom — only the button (child) takes touches.
          Idle vs cancel mode is driven by activeSosId (parity with MapScreen). */}
      {onSosPress && (
        <View style={styles.sosSlot} pointerEvents="box-none">
          <SosButton
            size={40}
            onPress={onSosPress}
            activeSosId={activeSosId}
            onCancelSos={onCancelSos}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      backgroundColor: c.gray200,   // tile-load backdrop
    },
    map: {
      flex: 1,
    },
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gray100,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      paddingHorizontal: spacing.lg,
    },
    placeholderText: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      // soft shadow so controls read over map tiles
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
    fabIcon: {
      fontSize: 18,
      color: c.textPrimary,
    },
    navArrow: {
      top: spacing.md,
      left: spacing.md,
    },
    recenter: {
      bottom: spacing.md,
      right: spacing.md,
    },
    liveBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    liveText: {
      ...typography.caption,
      fontWeight: '700',
      color: c.live,
      letterSpacing: 0.5,
    },
    sosSlot: {
      // No fixed size — wraps the SosButton so cancel mode (wider pill) isn't
      // clipped (matches MapScreen's content-sized wrap).
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
    },
  });
}
