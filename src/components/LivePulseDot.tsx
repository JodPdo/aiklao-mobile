// src/components/LivePulseDot.tsx
// Pulsing dot indicator — fades + expands on loop. Used to show "live" status.
// Default mode only — power-save mode renders a plain static dot instead.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export function LivePulseDot({ color = '#10B981', size = 8, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.2, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={[styles.wrap, { width: size * 3, height: size * 3 }, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View
        style={[
          styles.solid,
          { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute' },
  solid: { position: 'absolute' },
});
