// src/screens/trip/CreateTripScreen.tsx
// Journey creation form — user provides trip name + destination before tracking begins.
// Phase 6.0: F1 flow (auto-start background tracking on submit).
// Phase 6.1B: destination chosen via DestinationPicker (tap-to-pick map). The old
//   text-coord inputs + buggy "use current location" button are removed; the body
//   sent to POST /start is now always either null or a complete { name, lat, lng }.

import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
import { startBackgroundTracking } from '@/services/locationTask';
import { spacing, radius, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateTrip'>;
type CreateTripRoute = RouteProp<HomeStackParamList, 'CreateTrip'>;

interface Destination { name: string; lat: number; lng: number; }

export function CreateTripScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreateTripRoute>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(colors);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Receive the picked destination back from DestinationPicker (params-merge)
  useEffect(() => {
    if (route.params?.selectedDestination) {
      setDestination(route.params.selectedDestination);
    }
  }, [route.params?.selectedDestination]);

  function validate() {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = t('createTrip.nameRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // destination is always either null or a complete { name, lat, lng }
      const body = {
        name: name.trim(),
        destination: destination ?? undefined,
      };

      const res = await api.post<{ trip: { id: string } }>('/api/mobile/trips/start', body);
      const tripId = res.data.trip.id;

      try {
        await startBackgroundTracking(tripId);
      } catch (bgErr: any) {
        console.log('[create-trip] bg soft-fail:', bgErr?.message ?? bgErr);
      }

      navigation.replace('MapScreen', { tripId });
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      Alert.alert(t('createTrip.createFailed'), err?.response?.data?.error ?? err?.message ?? t('common.retry'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen padded={false} style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{t('createTrip.title')}</Text>
          <Text style={styles.subtitle}>{t('createTrip.subtitle')}</Text>

          {/* Trip Name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('createTrip.nameLabel')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder={t('createTrip.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Destination — tap-to-pick map (Phase 6.1B) */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('createTrip.destinationLabel')} <Text style={styles.optional}>{t('createTrip.optional')}</Text></Text>
            {destination ? (
              <View style={styles.destCard}>
                <Text style={styles.destName}>{destination.name}</Text>
                <Text style={styles.destCoords}>
                  {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                </Text>
                <Button
                  label={t('createTrip.changeDestination')}
                  variant="ghost"
                  onPress={() => navigation.navigate('DestinationPicker')}
                  fullWidth
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : (
              <Button
                label={t('createTrip.pickOnMap')}
                variant="ghost"
                onPress={() => navigation.navigate('DestinationPicker')}
                fullWidth
              />
            )}
          </View>
        </ScrollView>

        {/* Submit button (sticky bottom) */}
        <View style={styles.actionBar}>
          <Button
            label={submitting ? t('createTrip.submitting') : t('createTrip.submit')}
            onPress={handleSubmit}
            disabled={submitting}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
    title: { ...typography.h1, color: c.textPrimary, marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: c.textSecondary, marginBottom: spacing.xl },
    field: { marginBottom: spacing.md },
    label: { ...typography.caption, color: c.textPrimary, fontWeight: '500', marginBottom: spacing.xs },
    required: { color: c.danger },
    optional: { color: c.textSecondary, fontWeight: '400', fontSize: 11 },
    input: {
      ...typography.body,
      color: c.textPrimary,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    inputError: { borderColor: c.danger },
    errorText: { ...typography.caption, color: c.danger, marginTop: spacing.xs },
    destCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    destName: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
    destCoords: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    actionBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
  });
}
