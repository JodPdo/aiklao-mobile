// src/i18n/index.ts
// Device-locale-driven i18n (expo-localization + i18n-js v4).
//
// Rule (locked): device language 'th' → Thai; anything else → English.
// English is the fallback locale (enableFallback), so any key missing from `th`
// renders the English value rather than the raw key.
//
// Detection runs ONCE at module load — i.e. app startup, before the first render
// (App.tsx imports this module at the top). expo-localization is a native module,
// so this ships in a new APK build, not an OTA update.

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from './en';
import { th } from './th';

const i18n = new I18n({ en, th });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Thai has no plural distinction (CLDR: always "other"). Without this, i18n-js's
// default pluralizer asks for "one" at count===1, which Thai keys don't define —
// so it would fall back to the English "one" form. Force "other" for Thai.
i18n.pluralization.register('th', () => ['other']);

// languageCode is the bare language (e.g. 'th', 'en') without region.
const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.locale = deviceLanguage === 'th' ? 'th' : 'en';

/** Translate a dot-notation key (e.g. t('common.cancel')). */
export const t = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options);

/** The current resolved locale ('th' | 'en') — handy for date/format choices. */
export const currentLocale = i18n.locale;

export { i18n };
