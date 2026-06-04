// src/screens/trips/TripsScreen.tsx
// Phase 5.2 Session F: real trip history from GET /api/mobile/trips

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { api } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

interface TripItem {
  id: string;
  name: string;
  status: 'active' | 'archived';
  destination: { lat: number; lng: number; name: string | null } | null;
  createdAt: string;
  lastLocationAt: string | null;
  memberCount: number;
  isLeader: boolean;
}

// StatusBadge calls useTheme() directly — Option B (sub-component owns its theme)
function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const active = status === 'active';
  return (
    <View style={[
      staticBadgeStyles.badge,
      { backgroundColor: active ? colors.primary + '22' : colors.border },
    ]}>
      <Text style={[
        staticBadgeStyles.label,
        { color: active ? colors.primary : colors.textSecondary },
      ]}>
        {active ? 'Active' : 'Archived'}{/* TODO(thai) */}
      </Text>
    </View>
  );
}

const staticBadgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  label: { ...typography.caption, fontWeight: '600' },
});

export function TripsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = makeStyles(colors);

  const fetchTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ trips: TripItem[] }>('/api/mobile/trips');
      setTrips(res.data.trips);
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      setError('Could not load trips. Check your connection.'); // TODO(thai)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips]),
  );

  function handleTripPress(trip: TripItem) {
    // Cross-stack: switch Home tab and push TripDetail within its stack
    (navigation as any).navigate('Home', {
      screen: 'TripDetail',
      params: { tripId: trip.id },
    });
  }

  function renderItem({ item }: { item: TripItem }) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleTripPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.tripName} numberOfLines={1}>{item.name}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.metaText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaText}>
            {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}{/* TODO(thai) */}
          </Text>
          {item.isLeader && (
            <>
              <Text style={styles.metaDot}> · </Text>
              <Text style={styles.leaderText}>Leader{/* TODO(thai) */}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <Screen padded background="alt">
        <Text style={styles.title}>My Trips{/* TODO(thai) */}</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen padded background="alt">
        <Text style={styles.title}>My Trips{/* TODO(thai) */}</Text>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="Retry" // TODO(thai)
            variant="secondary"
            onPress={() => fetchTrips()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded background="alt">
      <Text style={styles.title}>My Trips{/* TODO(thai) */}</Text>
      <FlatList
        style={styles.list}
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={trips.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTrips(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyTitle}>No trips yet{/* TODO(thai) */}</Text>
            <Text style={styles.emptyBody}>
              Your trips will appear here once you start tracking.{/* TODO(thai) */}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    title: {
      ...typography.h2,
      color: c.textPrimary,
      marginBottom: spacing.md,
    },
    list: { flex: 1 },
    listContent: { paddingBottom: spacing.xl },
    emptyContent: { flex: 1 },
    emptyInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      ...typography.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    emptyBody: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { ...typography.body, color: c.danger, textAlign: 'center' },
    row: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    tripName: {
      ...typography.body,
      color: c.textPrimary,
      fontWeight: '600',
      flex: 1,
      marginRight: spacing.sm,
    },
    rowMeta: { flexDirection: 'row', alignItems: 'center' },
    metaText: { ...typography.caption, color: c.textSecondary },
    metaDot:  { ...typography.caption, color: c.textSecondary },
    leaderText: { ...typography.caption, color: c.primary },
  });
}
