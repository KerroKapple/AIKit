'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDict } from '@/app/_components/DictProvider';

export function TabNav() {
  const pathname = usePathname();
  const { dict } = useDict();
  const tabs = [
    { href: '/', label: dict.nav.chat, num: '01', kicker: 'TXT' },
    { href: '/image', label: dict.nav.image, num: '02', kicker: 'IMG' },
    { href: '/video', label: dict.nav.video, num: '03', kicker: 'MOV' },
  ] as const;
  return (
    <nav className="flex items-stretch divide-x divide-rule border-y border-rule">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'group flex-1 flex items-center gap-3 px-4 py-3 transition-colors relative',
              active ? 'bg-ink text-paper' : 'hover:bg-paper-deep',
            )}
          >
            <span className={cn('mono text-[0.68rem] tracking-[0.22em]', active ? 'text-vermilion' : 'text-ink-soft')}>
              §{t.num}
            </span>
            <span className="display text-xl md:text-2xl font-semibold italic leading-none">
              {t.label}
            </span>
            <span className={cn('ml-auto chip hidden sm:inline-flex', active && 'border-paper/30 text-paper/70')}>
              {t.kicker}
            </span>
            {active && <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-vermilion" />}
          </Link>
        );
      })}
    </nav>
  );
}
