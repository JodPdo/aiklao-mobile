import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  background?: 'default' | 'alt';
}

/**
 * Standard screen wrapper — handles safe area, status bar, and base padding.
 * Uses ThemeProvider for bg color so dark mode works correctly.
 */
export function Screen({
  children,
  style,
  padded = true,
  background = 'default',
}: ScreenProps) {
  const { colors, isDark } = useTheme();
  const bgColor = background === 'alt' ? colors.backgroundAlt : colors.background;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

// Layout/spacing only — no colors (those are computed inline above)
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padded: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
