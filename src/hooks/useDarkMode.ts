// src/hooks/useDarkMode.ts
// Dark mode state: auto-follows device color scheme by default, user can override.
// Override is stored in AsyncStorage and persists across restarts.

import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aiklao.dark_mode';
// Values: 'auto' (follow device), 'dark' (force on), 'light' (force off)
type DarkModePref = 'auto' | 'dark' | 'light';

export function useDarkMode() {
  const deviceScheme = useColorScheme();  // 'light' | 'dark' | null
  const [pref, setPref] = useState<DarkModePref>('auto');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'auto') {
          setPref(stored);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setDarkModePref = useCallback(async (next: DarkModePref) => {
    setPref(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  // Resolved boolean: is dark mode currently active?
  const isDark =
    pref === 'dark'  ? true :
    pref === 'light' ? false :
    deviceScheme === 'dark';  // 'auto' — follow device

  return { isDark, pref, setDarkModePref, loaded };
}
