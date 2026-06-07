// src/navigation/navigationRef.ts
// Container-level navigation ref so non-screen code (the deep-link handler)
// can navigate after the NavigationContainer is mounted.

import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { AppTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppTabParamList>();

/**
 * Navigate to a trip's detail screen from outside the React tree.
 * TripDetail lives in the Home tab's native stack, so we dispatch a nested
 * navigate action. No-op until the container is ready (caller retries on onReady).
 */
export function navigateToTrip(tripId: string) {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate('Home', { screen: 'TripDetail', params: { tripId } }),
  );
}
