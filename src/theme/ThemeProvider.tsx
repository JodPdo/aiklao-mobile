// src/theme/ThemeProvider.tsx
// Single source of truth for dark mode state.
// useDarkMode() is called HERE ONLY — state shared via context.
// Consumers call useTheme() to read colors/isDark and setDarkMode.

import React, { createContext, useContext, ReactNode } from 'react';
import { lightColors, darkColors } from './colors';
import type { Palette } from './colors';
import { useDarkMode } from '@/hooks/useDarkMode';

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
  setDarkMode: (next: boolean) => Promise<void>;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  setDarkMode: async () => {},
  loaded: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isDark, setDarkMode, loaded } = useDarkMode();
  const colors = (isDark ? darkColors : lightColors) as Palette;
  return (
    <ThemeContext.Provider value={{ colors, isDark, setDarkMode, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
