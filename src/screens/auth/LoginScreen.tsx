import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

export function LoginScreen() {
  const { signInWithLine } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const styles = makeStyles(colors);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithLine();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('login.signInFailed');
      Alert.alert(t('login.errorTitle'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded background="alt">
      <View style={styles.hero}>
        <Text style={styles.title}>AiKlao</Text>
        <Text style={styles.subtitle}>
          {t('login.subtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('login.signInWithLine')}
          onPress={handleLogin}
          loading={loading}
          fullWidth
        />
        <Text style={styles.note}>
          {t('login.note')}
        </Text>
      </View>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    hero: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...typography.h1,
      color: c.primary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
    },
    actions: {
      paddingBottom: spacing.xl,
    },
    note: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });
}
