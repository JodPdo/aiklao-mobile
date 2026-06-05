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
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography, radius } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'DestinationPicker'>;

const DEFAULT_NAME = 'จุดหมาย';
const BANGKOK = { lat: 13.7563, lng: 100.5018 };

export function DestinationPickerScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destName, setDestName] = useState<string>(DEFAULT_NAME);
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

  // self = current GPS (reference), destination = tapped pin
  const mapData: LeafletData = {
    self: defaultCenter
      ? { lat: defaultCenter.lat, lng: defaultCenter.lng, name: 'คุณ' }
      : undefined,
    destination: selectedCoords
      ? { lat: selectedCoords.lat, lng: selectedCoords.lng, name: destName }
      : undefined,
  };

  const handleMapTap = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });   // keep destName as user-entered
  };

  const handleConfirm = () => {
    if (!selectedCoords) {
      Alert.alert('เลือกจุดหมายก่อน', 'แตะที่แผนที่เพื่อเลือกจุดหมายปลายทาง');
      return;
    }
    const finalName = destName.trim() || DEFAULT_NAME;
    // Navigate back to the existing CreateTrip instance, merging the result params
    navigation.navigate('CreateTrip', {
      selectedDestination: { name: finalName, lat: selectedCoords.lat, lng: selectedCoords.lng },
    });
  };

  if (!defaultCenter) {
    return (
      <Screen>
        <Text style={styles.loading}>กำลังโหลดแผนที่...</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.flex}>
      <View style={styles.instruction}>
        <Text style={styles.instructionText}>แตะที่แผนที่เพื่อปักหมุดจุดหมาย</Text>
      </View>

      <LeafletMapView data={mapData} style={styles.map} onMapTap={handleMapTap} />

      {selectedCoords && (
        <View style={styles.form}>
          <Text style={styles.coords}>
            📍 {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
          </Text>
          <Text style={styles.label}>ชื่อจุดหมาย</Text>
          <TextInput
            style={styles.input}
            value={destName}
            onChangeText={setDestName}
            placeholder={DEFAULT_NAME}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Button
          label="ยกเลิก"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
        />
        <Button
          label="ยืนยัน"
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
    flex: { flex: 1, backgroundColor: c.background },
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
    instructionText: { ...typography.caption, color: c.textSecondary },
    map: { flex: 1 },
    form: {
      padding: spacing.md,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    coords: { ...typography.caption, color: c.textSecondary, marginBottom: spacing.sm },
    label: { ...typography.caption, color: c.textPrimary, marginBottom: 4 },
    input: {
      ...typography.body,
      color: c.textPrimary,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.background,
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
