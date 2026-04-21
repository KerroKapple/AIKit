'use client';
import { useEffect, useState } from 'react';
import { useDict } from '@/app/_components/DictProvider';

type TaskMeta = { expires_at: number };

export function ExpiryBanner({ tasks }: { tasks: TaskMeta[] }) {
  const { dict } = useDict();
  const earliest = tasks.reduce<number | null>((acc, t) => {
    if (t.expires_at < Date.now()) return acc;
    return acc === null || t.expires_at < acc ? t.expires_at : acc;
  }, null);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (earliest === null) return null;
  const remaining = Math.max(0, earliest - now);
  const mins = Math.floor(remaining / 60_000);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0 ? `${hrs}${dict.common.hours} ${mins % 60}${dict.common.minutes}` : `${mins}${dict.common.minutes}`;
  return (
    <div className="px-4 py-2 text-sm text-muted-foreground border-b bg-muted/30">
      ⏰ {dict.common.expiresAt}: {label} — {dict.common.saveNow}
    </div>
  );
}
