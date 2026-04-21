'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Dict, Locale } from '@/lib/i18n/types';

type Ctx = { dict: Dict; locale: Locale };
const DictContext = createContext<Ctx | null>(null);

export function DictProvider({ dict, locale, children }: Ctx & { children: ReactNode }) {
  return <DictContext.Provider value={{ dict, locale }}>{children}</DictContext.Provider>;
}

export function useDict(): Ctx {
  const ctx = useContext(DictContext);
  if (!ctx) throw new Error('useDict must be inside DictProvider');
  return ctx;
}
