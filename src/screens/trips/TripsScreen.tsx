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
import { colors, radius, spacing, typography } from '@/theme';

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

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeArchived]}>
      <Text style={[styles.badgeLabel, active ? styles.badgeLabelActive : styles.badgeLabelArchived]}>
        {active ? 'Active' : 'Archived'}{/* TODO(thai) */}
      </Text>
    </View>
  );
}

export function TripsScreen() {
  const navigation = useNavigation();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (trip.status !== 'active') return; // read-only detail deferred to Phase 5.6
    // Cross-stack: switch Home tab and push MapScreen within its stack
    (navigation as any).navigate('Home', {
      screen: 'MapScreen',
      params: { tripId: trip.id },
    });
  }

  function renderItem({ item }: { item: TripItem }) {
    const isActive = item.status === 'active';
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleTripPress(item)}
        activeOpacity={isActive ? 0.7 : 1}
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

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flex: 1,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tripName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaDot: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  leaderText: {
    ...typography.caption,
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeActive: {
    backgroundColor: colors.primary + '22',
  },
  badgeArchived: {
    backgroundColor: colors.border,
  },
  badgeLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  badgeLabelActive: {
    color: colors.primary,
  },
  badgeLabelArchived: {
    color: colors.textSecondary,
  },
});
