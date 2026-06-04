import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  // Variant styles computed inside component so they pick up the active theme palette
  const variantStyles: Record<ButtonVariant, { container: ViewStyle; labelColor: string }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      labelColor: colors.white,
    },
    secondary: {
      container: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
      },
      labelColor: colors.primary,
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      labelColor: colors.primary,
    },
    danger: {
      container: { backgroundColor: colors.danger },
      labelColor: colors.white,
    },
  };

  const current = variantStyles[variant];

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...current.container,
    ...(fullWidth && { alignSelf: 'stretch' }),
    ...(isDisabled && { opacity: 0.5 }),
    ...style,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={current.labelColor} />
      ) : (
        <Text style={[styles.label, { color: current.labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// Layout/spacing only — no theme colors
const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
  },
  label: {
    ...typography.button,
  },
});
