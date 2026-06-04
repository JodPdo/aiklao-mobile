// src/screens/trip/CreateTripScreen.tsx
// Journey creation form — user provides trip name + destination before tracking begins.
// Phase 6.0: F1 flow (auto-start background tracking on submit).

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
import { startBackgroundTracking } from '@/services/locationTask';
import { spacing, radius, typography } from '@/theme';
import type { Palette } from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateTrip'>;

export function CreateTripScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(colors);

  const [name, setName] = useState('');
  const [destName, setDestName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [showCoords, setShowCoords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; destName?: string }>({});

  function validate() {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'กรุณาใส่ชื่อทริป';
    if (showCoords) {
      if (destLat && isNaN(parseFloat(destLat))) errs.destName = 'พิกัด lat ไม่ถูกต้อง';
      if (destLng && isNaN(parseFloat(destLng))) errs.destName = 'พิกัด lng ไม่ถูกต้อง';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleUseCurrent() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'อนุญาตการเข้าถึงตำแหน่งเพื่อใช้พิกัดปัจจุบัน');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDestLat(loc.coords.latitude.toFixed(6));
      setDestLng(loc.coords.longitude.toFixed(6));
      setShowCoords(true);
    } catch (err: any) {
      Alert.alert('ไม่สามารถดึงพิกัด', err?.message ?? 'ลองใหม่');
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        destination: destName.trim() ? {
          name: destName.trim(),
          ...(destLat && destLng ? { lat: parseFloat(destLat), lng: parseFloat(destLng) } : {}),
        } : undefined,
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
      Alert.alert('สร้างทริปไม่สำเร็จ', err?.response?.data?.error ?? err?.message ?? 'ลองใหม่');
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
          <Text style={styles.title}>สร้างทริปใหม่</Text>
          <Text style={styles.subtitle}>กรอกข้อมูลให้สมาชิกในกลุ่มเห็นว่ากำลังไปไหน</Text>

          {/* Trip Name */}
          <View style={styles.field}>
            <Text style={styles.label}>ชื่อทริป <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="เช่น เที่ยวเชียงใหม่ ปีใหม่"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Destination Name (OPTIONAL in V1) */}
          <View style={styles.field}>
            <Text style={styles.label}>จุดหมาย <Text style={styles.optional}>(ไม่บังคับ)</Text></Text>
            <TextInput
              style={[styles.input, errors.destName && styles.inputError]}
              value={destName}
              onChangeText={setDestName}
              placeholder="เช่น ดอยสุเทพ"
              placeholderTextColor={colors.textSecondary}
              maxLength={120}
            />
            {errors.destName && <Text style={styles.errorText}>{errors.destName}</Text>}
          </View>

          {/* Use Current Location button */}
          <Button
            label={destLat ? `📍 พิกัด: ${destLat.slice(0, 9)}, ${destLng.slice(0, 9)}` : '📍 ใช้พิกัดปัจจุบันเป็นจุดหมาย'}
            variant="ghost"
            onPress={handleUseCurrent}
            fullWidth
            style={{ marginBottom: spacing.md }}
          />

          {/* Optional coordinates (toggle) */}
          {showCoords && (
            <View style={styles.coordsRow}>
              <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Lat</Text>
                <TextInput
                  style={styles.input}
                  value={destLat}
                  onChangeText={setDestLat}
                  keyboardType="decimal-pad"
                  placeholder="13.7563"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Lng</Text>
                <TextInput
                  style={styles.input}
                  value={destLng}
                  onChangeText={setDestLng}
                  keyboardType="decimal-pad"
                  placeholder="100.5018"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          )}

          {!showCoords && (
            <Text style={styles.hint}>
              💡 พิกัดสามารถเลือกจากแผนที่ได้ใน Phase 6.1
            </Text>
          )}
        </ScrollView>

        {/* Submit button (sticky bottom) */}
        <View style={styles.actionBar}>
          <Button
            label={submitting ? 'กำลังสร้าง...' : 'สร้างทริปและเริ่มเดินทาง'}
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
    coordsRow: { flexDirection: 'row' },
    hint: { ...typography.caption, color: c.textSecondary, fontStyle: 'italic', marginTop: spacing.sm },
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
