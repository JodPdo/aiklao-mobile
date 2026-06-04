import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { registerUnauthorizedHandler } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';

export function RootNavigator() {
  const { status, signOut } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      signOut();
    });
  }, [signOut]);

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
