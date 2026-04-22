'use client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDict } from '@/app/_components/DictProvider';
import type { Locale } from '@/lib/i18n/types';

const CODES: Locale[] = ['en', 'zh', 'th'];
const GLYPH: Record<Locale, string> = { en: 'EN', zh: '中', th: 'ไท' };

export function LangSwitcher() {
  const router = useRouter();
  const { locale } = useDict();
  const set = (l: Locale) => {
    if (l === locale) return;
    document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };
  return (
    <div className="inline-flex border border-ink">
      {CODES.map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={cn(
            'mono text-[0.72rem] tracking-[0.18em] px-2.5 py-1.5 transition-colors border-l border-ink first:border-l-0',
            locale === l ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-deep',
          )}
          aria-pressed={locale === l}
        >
          {GLYPH[l]}
        </button>
      ))}
    </div>
  );
}
