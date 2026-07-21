// src/screens/trip/useLeaveTrip.ts
// MB-5 — member self-leave (contract: MB5_LEAVE_TRIP_DESIGN.md, G1-approved 2026-07-21).
// Mirrors useSos.ts's shape: the hook owns the confirm dialog + API call + side
// effects; the screen only wires the returned handler to a UI trigger (the
// TripMoreActionsSheet "Leave trip" row).
//
// Only ever wired by the screen for a NON-leader caller — the leader is not
// offered this action at all (they archive the trip instead, per the design
// brief's Q1). If the backend ever returns LEADER_CANNOT_LEAVE/NOT_A_MEMBER
// anyway (a stale UI race), they fall through to the generic failure alert
// rather than getting bespoke copy — those are defensive-only paths that
// should not occur through the normal UI.
//
// Backend package for this endpoint has not landed yet — this hook is complete
// and tested against a mocked `leaveTrip`, but must not be pointed at a live
// server until the backend package ships.

import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { leaveTrip } from '@/api/client';
import { stopBackgroundTracking } from '@/services/locationTask';
import { t } from '@/i18n';
import type { HomeStackParamList } from '@/navigation/types';

export interface UseLeaveTripParams {
  tripId: string;
  /** Is THIS device currently sharing location for this trip (TripDetailScreen's isSharing). */
  isSharing: boolean;
  navigation: NativeStackNavigationProp<HomeStackParamList, 'TripDetail'>;
  /** Re-fetch the trip — used only on the ALREADY_ARCHIVED path (stay on-screen, refresh state). */
  reloadTrip: () => void;
}

export interface UseLeaveTripResult {
  /** Confirm dialog -> DELETE .../members/me -> stop tracking (if sharing) -> back to the trip list. */
  handleLeaveTrip: () => void;
}

export function useLeaveTrip({ tripId, isSharing, navigation, reloadTrip }: UseLeaveTripParams): UseLeaveTripResult {
  const doLeave = async () => {
    try {
      await leaveTrip(tripId);
      // Leaving without stopping the tracker would keep POSTing location for a trip
      // this device is no longer a member of — the exact privacy gap MB-5 closes (SEC-7).
      if (isSharing) await stopBackgroundTracking();
      navigation.navigate('HomeMain');
    } catch (e: any) {
      if (e?.response?.status === 401) return; // global 401 handler already runs
      if (e.code === 'ALREADY_ARCHIVED') {
        Alert.alert(t('trip.leaveTrip.alreadyArchivedTitle'), t('trip.leaveTrip.alreadyArchivedMessage'));
        reloadTrip();
        return;
      }
      Alert.alert(t('trip.leaveTrip.failed'), e.message || t('common.retry'));
    }
  };

  const handleLeaveTrip = () => {
    Alert.alert(
      t('trip.leaveTrip.title'),
      t('trip.leaveTrip.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('trip.leaveTrip.confirm'), style: 'destructive', onPress: doLeave },
      ],
    );
  };

  return { handleLeaveTrip };
}
