import { describe, it, expect } from 'vitest';
import { getDict, normalizeLocale, LOCALES, DEFAULT_LOCALE } from '@/lib/i18n';
import en from '@/lib/i18n/en';
import zh from '@/lib/i18n/zh';
import th from '@/lib/i18n/th';

describe('i18n', () => {
  it('returns default en when no locale', () => {
    expect(getDict(undefined).nav.chat).toBe('Chat');
  });

  it('returns zh for zh', () => {
    expect(getDict('zh').nav.chat).toBe('对话');
  });

  it('returns th for th', () => {
    expect(getDict('th').nav.chat).toBe('แชท');
  });

  it('falls back to default for unknown', () => {
    expect(getDict('fr').nav.chat).toBe('Chat');
  });

  it('normalizeLocale returns valid locale', () => {
    expect(normalizeLocale('zh')).toBe('zh');
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('xx')).toBe(DEFAULT_LOCALE);
  });

  it('all dicts share identical key structure', () => {
    const flatten = (o: unknown, prefix = ''): string[] => {
      if (typeof o !== 'object' || o === null) return [prefix];
      return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        flatten(v, prefix ? `${prefix}.${k}` : k),
      );
    };
    const enKeys = flatten(en).sort();
    expect(flatten(zh).sort()).toEqual(enKeys);
    expect(flatten(th).sort()).toEqual(enKeys);
  });

  it('LOCALES exports all 3', () => {
    expect(LOCALES).toEqual(['en', 'zh', 'th']);
  });
});
