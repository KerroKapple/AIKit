import en from './en';
import zh from './zh';
import th from './th';
import { type Dict, type Locale, DEFAULT_LOCALE, LOCALES } from './types';

const DICTS: Record<Locale, Dict> = { en, zh, th };

export function getDict(locale: string | undefined): Dict {
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return DICTS[locale as Locale];
  }
  return DICTS[DEFAULT_LOCALE];
}

export function normalizeLocale(locale: string | undefined | null): Locale {
  if (locale && (LOCALES as readonly string[]).includes(locale)) return locale as Locale;
  return DEFAULT_LOCALE;
}

export { type Dict, type Locale, DEFAULT_LOCALE, LOCALES };
