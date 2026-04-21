'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDict } from '@/app/_components/DictProvider';

export function TabNav() {
  const pathname = usePathname();
  const { dict } = useDict();
  const tabs = [
    { href: '/', label: dict.nav.chat },
    { href: '/image', label: dict.nav.image },
    { href: '/video', label: dict.nav.video },
  ] as const;
  return (
    <nav className="flex items-center gap-1">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'px-4 py-2 text-sm rounded-md transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
