'use client';
import { useState, type KeyboardEvent } from 'react';
import { useDict } from '@/app/_components/DictProvider';
import { cn } from '@/lib/utils';

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const { dict } = useDict();
  const [v, setV] = useState('');
  const submit = () => {
    const text = v.trim();
    if (!text || disabled) return;
    onSend(text);
    setV('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const count = v.length;

  return (
    <div className="border-t-2 border-ink bg-paper">
      <div className="flex items-stretch">
        <div className="hidden sm:flex flex-col items-center justify-between py-3 px-3 border-r border-rule bg-paper-deep min-w-[56px]">
          <span className="mono text-[0.62rem] tracking-[0.22em] text-ink-soft">TX</span>
          <span className="mono text-[0.62rem] text-ink-soft">{count}</span>
        </div>
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={onKey}
          placeholder={dict.chat.placeholder}
          disabled={disabled}
          rows={3}
          className={cn(
            'flex-1 resize-none bg-transparent outline-none px-4 py-3',
            'font-sans text-base leading-relaxed placeholder:italic placeholder:text-ink-soft/50',
            disabled && 'opacity-50',
          )}
        />
        <button
          onClick={submit}
          disabled={disabled || !v.trim()}
          className="ink-btn rounded-none px-5 self-stretch border-y-0 border-r-0 border-l border-ink"
        >
          {disabled ? '···' : dict.chat.send}
          <span aria-hidden className="ml-1">→</span>
        </button>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-rule text-[0.62rem] mono text-ink-soft tracking-widest uppercase">
        <span>↵ send · ⇧↵ newline</span>
        <span>wire open</span>
      </div>
    </div>
  );
}
