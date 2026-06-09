// src/hooks/usePowerSaveMode.ts
// Power-save mode — a SHARED, LIVE store. `powerSave` lives in a single
// module-level value with a subscriber set, exposed via useSyncExternalStore, so
// toggling it anywhere (Settings) instantly re-renders every mounted consumer
// (TripDetail's 60s-refresh gating + map placeholder, etc.) WITHOUT a remount.
// Persisted to AsyncStorage; auto-flips on once when battery < 20%.
//
// Public API is unchanged: { powerSave, batteryLevel, loaded, togglePowerSave }.
// Only `powerSave` is shared; `batteryLevel` stays per-hook.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { restartBackgroundTracking } from '@/services/locationTask';

const STORAGE_KEY = 'aiklao.power_save_mode';
const BATTERY_THRESHOLD = 0.20;  // 20%

// ─── Module-level shared store (single source of truth for powerSave) ────────────

let powerSaveValue = false;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getPowerSaveSnapshot = () => powerSaveValue;
const getHydratedSnapshot = () => hydrated;

/**
 * Set the shared value, notify subscribers (sync), persist, and — when the value
 * actually changes — restart any running background trip so the OS picks up the
 * new POST cadence (it caches timeInterval/accuracy at startLocationUpdatesAsync,
 * so persisting alone would NOT change real battery behavior mid-trip).
 * restartBackgroundTracking() is a no-op when no trip is active.
 */
async function setPowerSaveValue(next: boolean): Promise<void> {
  const changed = powerSaveValue !== next;
  if (changed) {
    powerSaveValue = next;
    emit();
  }
  await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
  if (changed) {
    try {
      await restartBackgroundTracking();   // reads the freshly-persisted cadence
    } catch (err) {
      console.log('[power-save] restart tracking failed:', err);
    }
  }
}

// Hydrate once from AsyncStorage at module load; notify so already-mounted
// consumers pick up the persisted value (and the auto-trigger can run).
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (stored === '1') powerSaveValue = true;
  })
  .catch(() => {})
  .finally(() => {
    hydrated = true;
    emit();
  });

// ─── Hook (public API unchanged) ──────────────────────────────────────────────────

export function usePowerSaveMode() {
  // Shared, live across every mounted consumer.
  const powerSave = useSyncExternalStore(subscribe, getPowerSaveSnapshot);
  const loaded = useSyncExternalStore(subscribe, getHydratedSnapshot);

  // batteryLevel stays per-hook (only powerSave is shared).
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (mounted) setBatteryLevel(level);
      } catch {}
    })();
    const sub = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
      if (mounted) setBatteryLevel(level);
    });
    return () => { mounted = false; sub.remove(); };
  }, []);

  const togglePowerSave = useCallback(async (next?: boolean) => {
    await setPowerSaveValue(typeof next === 'boolean' ? next : !powerSaveValue);
  }, []);

  // Auto-trigger: flip on ONCE when battery < 20%. Waits for hydration so it can
  // never override a persisted "off". Guarded per-hook; the shared setter is
  // idempotent, so concurrent consumers can't double-flip.
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!loaded || autoTriggered || powerSave) return;
    if (batteryLevel !== null && batteryLevel < BATTERY_THRESHOLD) {
      setPowerSaveValue(true);
      setAutoTriggered(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryLevel, loaded, autoTriggered, powerSave]);

  return {
    powerSave,
    batteryLevel,         // 0-1 range, multiply by 100 for percentage display
    loaded,
    togglePowerSave,
  };
}
