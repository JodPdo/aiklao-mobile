// src/hooks/useDarkMode.ts
// Dark mode state — in-app toggle ONLY. Does NOT follow device theme.
// Default: light. Persisted to AsyncStorage.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aiklao.dark_mode';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        // Migration: treat old 'dark' value as true, everything else
        // (including 'auto' from v0.3.0-v0.3.2 and 'light') as false
        if (stored === '1' || stored === 'dark') setIsDark(true);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setDarkMode = useCallback(async (next: boolean) => {
    setIsDark(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
  }, []);

  return { isDark, loaded, setDarkMode };
}
