// src/services/locationTask.ts
// Background location task — registered at module load, must be imported from App.tsx root.
// Reads tripId from AsyncStorage, POSTs each location to backend.
// Pattern A: this is the SOLE POST trigger (foreground + background).

import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api } from '@/api/client';

export const BG_LOCATION_TASK = 'aiklao-bg-location';
export const ACTIVE_TRIP_KEY = 'aiklao.bg.active_trip_id';
export const POWER_SAVE_KEY = 'aiklao.power_save_mode';  // shared with usePowerSaveMode hook

async function getCurrentInterval(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(POWER_SAVE_KEY);
    return saved === '1' ? 30000 : 10000;  // 30s power-save vs 10s default
  } catch {
    return 10000;
  }
}

TaskManager.defineTask(
  BG_LOCATION_TASK,
  async ({
    data,
    error,
  }: {
    data: { locations: Location.LocationObject[] };
    error: { message: string } | null;
  }) => {
    if (error) {
      console.log('[bg-location] task error:', error.message);
      return;
    }
    const locations = data?.locations;
    if (!locations?.length) return;

    const tripId = await AsyncStorage.getItem(ACTIVE_TRIP_KEY);
    if (!tripId) return; // task should have been stopped — guard

    for (const loc of locations) {
      try {
        await api.post(`/api/mobile/trips/${tripId}/location`, {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: new Date(loc.timestamp).toISOString(),
        });
      } catch (err: any) {
        if (err?.response?.status === 401) return; // global handler signs out
        console.log('[bg-location] post failed:', err?.message ?? err);
      }
    }
  },
);

// Set AsyncStorage FIRST so it's always written even if startLocationUpdatesAsync throws.
export async function startBackgroundTracking(tripId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, tripId);
  const interval = await getCurrentInterval();
  const powerSave = interval > 10000;
  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: powerSave ? Location.Accuracy.Balanced : Location.Accuracy.High,
    distanceInterval: powerSave ? 25 : 10,  // looser in power-save mode
    timeInterval: interval,
    foregroundService: {
      notificationTitle: 'AiKlao tracking trip', // TODO(thai)
      notificationBody: 'Tap to view trip map',  // TODO(thai)
      notificationColor: '#0E7C66',
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.LocationActivityType.AutomotiveNavigation,
  });
}

// Restart with updated interval — called when power-save mode is toggled while sharing.
export async function restartBackgroundTracking(): Promise<void> {
  const tripId = await getActiveTripId();
  if (!tripId) return;
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
  if (isRunning) await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
  await startBackgroundTracking(tripId);
}

// Always removes AsyncStorage, even if the task was not running (e.g. killed by OS).
export async function stopBackgroundTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
  }
  await AsyncStorage.removeItem(ACTIVE_TRIP_KEY);
}

export async function getActiveTripId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_TRIP_KEY);
}
