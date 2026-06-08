/**
 * AiKlao color palettes — light (pink-cream) + dark (purple-teal)
 * Primary brand: forest green (#0E7C66) — สื่อถึงการเดินทาง + ธรรมชาติ
 *
 * `colors` named export = lightColors for backward compat.
 * Dark-mode-aware components use useTheme() from ThemeProvider.
 */

export const lightColors = {
  // Brand
  primary:       '#0E7C66',
  primaryDark:   '#0A5C4C',
  primaryLight:  '#3DA88F',

  // Semantic
  success:  '#2E7D32',
  warning:  '#E89B23',
  danger:   '#D14343',
  info:     '#1E88E5',
  live:     '#10B981',

  // Neutrals — shared reference scale
  black:    '#0F1419',
  gray900:  '#1A1F24',
  gray800:  '#2D3439',
  gray700:  '#4A5259',
  gray600:  '#6B7480',
  gray500:  '#8E97A1',
  gray400:  '#B5BCC4',
  gray300:  '#D6DBE0',
  gray200:  '#E8ECEF',
  gray100:  '#F4F6F8',
  white:    '#FFFFFF',

  // Surfaces — neutral page bg, white cards (Step 3b: was pink-cream)
  // Semantics: background/backgroundAlt = neutral PAGE bg; surface = white CARD.
  // Cards stay white (#FFF) so they read against the neutral page via a hairline
  // border. Dark mode is intentionally NOT changed.
  background:    '#F4F6F8',   // neutral light-gray page bg
  backgroundAlt: '#EEF1F5',   // slightly deeper neutral (card-heavy screens — Home/Trips/Login)
  surface:       '#FFFFFF',   // pure white cards — contrast on neutral bg via border
  border:        '#D6DBE0',   // neutral light-gray border (Step 3c: was pink #F0C7D5)

  // Text
  textPrimary:   '#0F1419',
  textSecondary: '#6B7480',
  textInverse:   '#FFFFFF',

  // Accent surfaces — pastel section tints
  accentCream:    '#FCF7E3',  // warm cream (e.g. info sections)
  accentMint:     '#E3FCEB',  // soft mint (e.g. success / active sections)
  accentLavender: '#E3E8FC',  // light lavender (e.g. feature highlights)
  accentWine:     '#FFE9C7',  // warm amber (power-save active bg, light mode)
} as const;

export const darkColors = {
  // Brand — brighter for dark backgrounds
  primary:       '#1FA384',
  primaryDark:   '#156B54',
  primaryLight:  '#2DB38F',

  // Semantic — brighter/saturated for dark contexts
  success:  '#34D399',
  warning:  '#F0A93A',
  danger:   '#F87171',
  info:     '#60A5FA',
  live:     '#34D399',   // slightly brighter live indicator in dark

  // Neutrals — same reference scale
  black:    '#0F1419',
  gray900:  '#1A1F24',
  gray800:  '#2D3439',
  gray700:  '#4A5259',
  gray600:  '#6B7480',
  gray500:  '#8E97A1',
  gray400:  '#B5BCC4',
  gray300:  '#D6DBE0',
  gray200:  '#E8ECEF',
  gray100:  '#F4F6F8',
  white:    '#FFFFFF',

  // Surfaces — deep purple + teal palette (user-selected)
  background:    '#1D0539',   // deep purple base
  backgroundAlt: '#053937',   // dark teal alt
  surface:       '#2A1052',   // lighter purple (cards)
  border:        '#4A2570',   // purple border

  // Text
  textPrimary:   '#F6F7F9',
  textSecondary: '#9CA3AF',
  textInverse:   '#0F1E1A',

  // Accent surfaces — dark-mode tints
  accentCream:    '#213905',  // dark olive (warm surface in dark)
  accentMint:     '#213905',  // same dark olive (success/active)
  accentLavender: '#053937',  // dark teal (info highlights)
  accentWine:     '#390507',  // deep wine (power-save active bg, dark mode)
} as const;

// Backward compat: `colors` = light palette; all existing imports unchanged
export const colors = lightColors;

export type ColorKey = keyof typeof lightColors;
// Palette maps the same keys as lightColors but widens values to string,
// so both lightColors and darkColors satisfy it without literal conflicts.
export type Palette = { [K in keyof typeof lightColors]: string };
