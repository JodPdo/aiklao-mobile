// src/hooks/usePowerSaveMode.ts
// Power-save mode state + auto-trigger when device battery < 20%.
// Mode is persisted to AsyncStorage so it survives app restarts.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';

const STORAGE_KEY = 'aiklao.power_save_mode';
const BATTERY_THRESHOLD = 0.20;  // 20%

export function usePowerSaveMode() {
  const [powerSave, setPowerSave] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load persisted mode on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === '1') setPowerSave(true);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Subscribe to battery level
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

  // Auto-trigger: if battery < 20% AND not yet in power-save → flip on (only ONCE per session)
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!loaded || autoTriggered || powerSave) return;
    if (batteryLevel !== null && batteryLevel < BATTERY_THRESHOLD) {
      togglePowerSave(true);
      setAutoTriggered(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryLevel, loaded, autoTriggered, powerSave]);

  const togglePowerSave = useCallback(async (next?: boolean) => {
    const target = typeof next === 'boolean' ? next : !powerSave;
    setPowerSave(target);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, target ? '1' : '0');
    } catch {}
  }, [powerSave]);

  return {
    powerSave,
    batteryLevel,         // 0-1 range, multiply by 100 for percentage display
    loaded,
    togglePowerSave,
  };
}
