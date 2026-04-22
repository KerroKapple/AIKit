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
    <div className="flex items-center gap-3 border border-vermilion/40 bg-vermilion/5 px-3 py-2 mono text-[0.72rem] tracking-wider uppercase text-vermilion-ink">
      <span className="chip chip-vermilion">⏱ {dict.common.expiresAt}</span>
      <span>{label}</span>
      <span className="ml-auto italic display normal-case tracking-normal text-ink-soft">— {dict.common.saveNow}</span>
    </div>
  );
}
