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

// DATA-4: server enforces a 12s minimum between location POSTs per member
// (application.yml:153). At the old 10s default, ~half of every POST was rejected and real
// resolution was ~20s, not 10s. 15s clears the limit with margin for clock drift/jitter
// instead of sitting exactly on the boundary.
const DEFAULT_INTERVAL_MS = 15000;
const POWER_SAVE_INTERVAL_MS = 30000;

// Reads the flag directly rather than inferring power-save from the interval value —
// `interval > 10000` broke the moment DEFAULT_INTERVAL_MS stopped being 10000.
async function isPowerSaveMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(POWER_SAVE_KEY)) === '1';
  } catch {
    return false;
  }
}

// Backoff after an HTTP 429 (rate-limited) response from the location POST endpoint.
// This is a background task with no React context available (same constraint as
// POWER_SAVE_KEY/isPowerSaveMode above), so the backoff state is just a plain
// module-level variable rather than something routed through app state.
//
// A "tick" here is one task invocation (one batch of locations Expo delivers on the
// configured timeInterval/distanceInterval). On a 429 we skip posting for the next
// few ticks instead of immediately retrying at the same cadence and getting
// rate-limited again right away.
const RATE_LIMIT_BACKOFF_TICKS = 4;
let rateLimitSkipTicksRemaining = 0;

/** Exposed for tests only — resets module-level backoff state between test cases. */
export function __resetRateLimitBackoffForTests(): void {
  rateLimitSkipTicksRemaining = 0;
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

    if (rateLimitSkipTicksRemaining > 0) {
      rateLimitSkipTicksRemaining -= 1;
      console.log(`[bg-location] skipping tick — backing off after 429 (${rateLimitSkipTicksRemaining} left)`);
      return;
    }

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
        if (err?.response?.status === 429) {
          rateLimitSkipTicksRemaining = RATE_LIMIT_BACKOFF_TICKS;
          console.log(`[bg-location] rate-limited (429) — backing off for ${RATE_LIMIT_BACKOFF_TICKS} ticks`);
          return; // stop this batch too; no point posting the rest right away
        }
        console.log('[bg-location] post failed:', err?.message ?? err);
      }
    }
  },
);

// Set AsyncStorage FIRST so it's always written even if startLocationUpdatesAsync throws.
export async function startBackgroundTracking(tripId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, tripId);
  const powerSave = await isPowerSaveMode();
  const interval = powerSave ? POWER_SAVE_INTERVAL_MS : DEFAULT_INTERVAL_MS;
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

// B2-3: ACTIVE_TRIP_KEY only records intent to share — it goes stale if the OS kills the
// task outside stopBackgroundTracking() (permission revoked, force-quit, battery kill).
// Callers that need to know whether location is ACTUALLY being sent, not just whether the
// app last asked for it to be, should check this too rather than trusting getActiveTripId()
// alone (this is the same class of bug the old MapScreen status badge had — permission
// granted was displayed as "tracking", when it only meant tracking was allowed to happen).
export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
}
