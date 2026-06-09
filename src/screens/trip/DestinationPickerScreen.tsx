// src/screens/trip/DestinationPickerScreen.tsx
// Phase 6.1B — Map picker for trip destination. Tap the map to drop a pin,
// edit the name, confirm → returns { name, lat, lng } to CreateTrip.

import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { LeafletMapView, LeafletData } from '@/components/LeafletMapView';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography, radius } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'DestinationPicker'>;

const BANGKOK = { lat: 13.7563, lng: 100.5018 };

export function DestinationPickerScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // Localized default destination name — also the value sent to the backend when
  // the user leaves the name blank.
  const defaultName = t('destinationPicker.defaultName');

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destName, setDestName] = useState<string>(defaultName);
  const [defaultCenter, setDefaultCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Default map center = current GPS (one-shot), Bangkok fallback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) setDefaultCenter(BANGKOK);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) setDefaultCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        if (mounted) setDefaultCenter(BANGKOK);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // self omitted — this screen focuses on destination only (the green self
  // marker read as a destination pin). Only the tapped destination is shown.
  const mapData: LeafletData = {
    destination: selectedCoords
      ? { lat: selectedCoords.lat, lng: selectedCoords.lng, name: destName }
      : undefined,
  };

  const handleMapTap = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });   // keep destName as user-entered
  };

  const handleConfirm = () => {
    if (!selectedCoords) {
      Alert.alert(t('destinationPicker.noSelectionTitle'), t('destinationPicker.noSelectionBody'));
      return;
    }
    const finalName = destName.trim() || defaultName;
    // Navigate back to the existing CreateTrip instance, merging the result params
    navigation.navigate('CreateTrip', {
      selectedDestination: { name: finalName, lat: selectedCoords.lat, lng: selectedCoords.lng },
    });
  };

  if (!defaultCenter) {
    return (
      <Screen>
        <Text style={styles.loading}>{t('destinationPicker.loadingMap')}</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.flex}>
      <View style={styles.instruction}>
        <Text style={styles.instructionText}>💡 {t('destinationPicker.instruction')}</Text>
      </View>

      <LeafletMapView
        data={mapData}
        style={styles.map}
        onMapTap={handleMapTap}
        center={defaultCenter ?? undefined}
      />

      {selectedCoords && (
        <View style={styles.form}>
          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>{t('destinationPicker.selectedLocation')}</Text>
            <Text style={styles.coordsValue}>
              {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
            </Text>
          </View>
          <Text style={styles.label}>{t('destinationPicker.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={destName}
            onChangeText={setDestName}
            placeholder={defaultName}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
        />
        <Button
          label={t('common.confirm')}
          onPress={handleConfirm}
          disabled={!selectedCoords}
          style={styles.footerBtn}
        />
      </View>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    // White surfaces throughout (c.surface = #FFFFFF). c.background is the
    // theme's pink base — intentionally avoided here so the picker reads clean.
    flex: { flex: 1, backgroundColor: c.surface },
    loading: {
      ...typography.body,
      textAlign: 'center',
      marginTop: spacing.xl,
      color: c.textSecondary,
    },
    instruction: {
      padding: spacing.md,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    instructionText: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
    map: { flex: 1 },
    form: {
      padding: spacing.md,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    coordsCard: {
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    coordsLabel: {
      ...typography.caption,
      color: c.textSecondary,
      marginBottom: 4,
    },
    coordsValue: {
      ...typography.body,
      color: c.textPrimary,
      fontFamily: 'monospace',
    },
    label: { ...typography.caption, color: c.textPrimary, marginBottom: 4 },
    input: {
      ...typography.body,
      color: c.textPrimary,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerBtn: { flex: 1 },
  });
}
