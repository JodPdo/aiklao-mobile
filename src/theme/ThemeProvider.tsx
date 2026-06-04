// src/theme/ThemeProvider.tsx
// Exposes the active palette (light or dark) via context.
// Components call useTheme() to access colors that match current mode.

import React, { createContext, useContext, ReactNode } from 'react';
import { lightColors, darkColors } from './colors';
import type { Palette } from './colors';
import { useDarkMode } from '@/hooks/useDarkMode';

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isDark } = useDarkMode();
  const colors = (isDark ? darkColors : lightColors) as Palette;
  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
