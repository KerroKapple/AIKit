'use client';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useDict } from '@/app/_components/DictProvider';
import type { Locale } from '@/lib/i18n/types';

const LABELS: Record<Locale, string> = { en: 'English', zh: '中文', th: 'ไทย' };
const FLAGS: Record<Locale, string> = { en: 'EN', zh: 'ZH', th: 'TH' };

export function LangSwitcher() {
  const router = useRouter();
  const { locale } = useDict();
  const set = (l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" />
          <span>{FLAGS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(LABELS) as Locale[]).map((l) => (
          <DropdownMenuItem key={l} onClick={() => set(l)}>
            {LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
