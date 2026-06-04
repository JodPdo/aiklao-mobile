// src/components/MiniMapPlaceholder.tsx
// Placeholder for map preview area. Renders a faux-map gradient with member dots.
// Replaces with real <MapView> in Session E.1.5 when Maps API key is acquired.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface Member {
  id: string;
  lineUserId: string;
  hasLocation: boolean;
  color: string;        // from avatarColor() in TripDetailScreen
  char: string;         // first character of displayName
}

interface Props {
  members: Member[];
}

// Fixed grid positions for up to 5 member dots — aesthetic distribution only
const POSITIONS: { top: string; left: string }[] = [
  { top: '30%', left: '30%' },
  { top: '55%', left: '60%' },
  { top: '42%', left: '50%' },
  { top: '60%', left: '30%' },
  { top: '35%', left: '70%' },
];

export function MiniMapPlaceholder({ members }: Props) {
  const withLocation = members.filter(m => m.hasLocation);

  return (
    <View style={styles.container}>
      <View style={styles.grid} />
      {withLocation.slice(0, 5).map((m, i) => (
        <View
          key={m.id}
          style={[
            styles.pin,
            {
              backgroundColor: m.color,
              top: POSITIONS[i].top as any,
              left: POSITIONS[i].left as any,
            },
          ]}
        >
          <Text style={styles.pinText}>{m.char}</Text>
        </View>
      ))}
      <Text style={styles.label}>Map preview · ต้องการ Google Maps API key</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: '#EAEFEE',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  grid: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // RN doesn't support background-image; subtle solid is fine for placeholder
  },
  pin: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    fontSize: 10,
    color: colors.textSecondary,
  },
});
