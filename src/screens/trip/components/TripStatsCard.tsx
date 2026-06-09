// src/screens/trip/components/TripStatsCard.tsx
// Clean stats card under the map: icon columns for จุดหมาย | ระยะ (| ETA).
//
// ETA: the backend (GET /api/mobile/trips/:id) does NOT return ETA yet — only
// distanceKm. So the ETA column is built but withheld behind SHOW_ETA. Flip the
// flag (and pass `etaText`) to re-enable it as a third column; the divider/layout
// already account for it.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

// Single switch to bring ETA back once the backend returns it. Keep false for now.
const SHOW_ETA = false;

export interface TripStatsCardProps {
  destinationName?: string | null;     // trip.destination?.name (null → empty state)
  distanceKm?: number | null;          // selfMember.lastLocation.distanceKm (null → "—")
  etaText?: string;                    // reserved — only rendered when SHOW_ETA
}

interface Column {
  key: string;
  label: string;
  value: string;
  unit?: string;
  muted?: boolean;     // dim the value (empty/placeholder state)
  metric?: boolean;    // large number styling vs. plain text
}

export function TripStatsCard({ destinationName, distanceKm, etaText }: TripStatsCardProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const hasDest = destinationName != null && destinationName.trim().length > 0;
  const hasDist = distanceKm != null;

  const columns: Column[] = [
    {
      key: 'dest',
      label: t('trip.stats.destination'),
      value: hasDest ? destinationName!.trim() : t('trip.stats.noDestination'),
      muted: !hasDest,
      metric: false,
    },
    {
      key: 'dist',
      label: t('trip.stats.distance'),
      value: hasDist ? distanceKm!.toFixed(1) : '—',
      unit: hasDist ? t('trip.stats.km') : undefined,
      muted: !hasDist,
      metric: true,
    },
    ...(SHOW_ETA
      ? [{
          key: 'eta',
          label: t('trip.stats.eta'),
          value: etaText ?? '—',
          muted: etaText == null,
          metric: true,
        } as Column]
      : []),
  ];

  return (
    <View style={styles.card}>
      {columns.map((col, i) => (
        <React.Fragment key={col.key}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.col}>
            <View style={styles.valueRow}>
              <Text
                style={[
                  col.metric ? styles.valueMetric : styles.valueText,
                  col.muted && styles.valueMuted,
                ]}
                numberOfLines={1}
              >
                {col.value}
              </Text>
              {col.unit != null && <Text style={styles.unit}>{col.unit}</Text>}
            </View>
            <Text style={styles.label}>{col.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    col: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.sm,
      gap: 2,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 3,
    },
    valueMetric: {
      ...typography.h2,
      color: c.textPrimary,
    },
    valueText: {
      ...typography.body,
      fontWeight: '600',
      color: c.textPrimary,
      textAlign: 'center',
    },
    valueMuted: {
      color: c.textSecondary,
      fontWeight: '500',
    },
    unit: {
      ...typography.caption,
      color: c.textSecondary,
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: spacing.xs,
    },
  });
}
