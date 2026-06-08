// src/screens/trip/components/Avatar.tsx
// Member avatar — picture with initial-letter fallback, leader ring, online dot.
// Extracted from TripDetailScreen (Phase 6.x) so member rows can reuse it.

import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, typography } from '@/theme';
import {
  Member,
  OFFLINE_THRESHOLD_MS,
  avatarColor,
  avatarChar,
} from '../tripShared';

export function Avatar({ member, size = 52 }: { member: Member; size?: number }) {
  const { colors } = useTheme();  // Option B — sub-component owns its theme
  const [imgFailed, setImgFailed] = useState(false);
  const showFallback = !member.pictureUrl || imgFailed;
  const bg = avatarColor(member.lineUserId);
  const char = avatarChar(member.displayName);
  const isOnline =
    !!member.lastLocation &&
    Date.now() - new Date(member.lastLocation.createdAt).getTime() <= OFFLINE_THRESHOLD_MS;

  const avatarStyle = [
    styles.base,
    { width: size, height: size, borderRadius: size / 2 },
    member.isLeader && { borderWidth: 2.5, borderColor: colors.warning },
  ] as const;

  return (
    <View style={styles.wrapper}>
      {showFallback ? (
        <View style={[...avatarStyle, { backgroundColor: bg }]}>
          <Text style={[styles.char, { color: colors.textInverse }, size < 52 && { fontSize: 14 }]}>
            {char}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: member.pictureUrl! }}
          style={avatarStyle as any}
          onError={() => setImgFailed(true)}
        />
      )}
      {!member.isLeader && isOnline && (
        <View style={[styles.liveDot, { backgroundColor: colors.live, borderColor: colors.backgroundAlt }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  base: { alignItems: 'center', justifyContent: 'center' },
  char: { ...typography.h3 },
  liveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
});
