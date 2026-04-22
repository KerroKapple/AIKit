'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function MessageList({ messages, pendingAssistant }: { messages: ChatMsg[]; pendingAssistant: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAssistant]);

  const empty = messages.length === 0 && pendingAssistant === null;

  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-6 py-6">
      {empty ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-10">
          <div className="eyebrow">—— Dossier empty ——</div>
          <p className="display italic text-3xl md:text-4xl max-w-md">
            &ldquo;Begin <span className="text-vermilion">anywhere</span>. A single line will do.&rdquo;
          </p>
          <div className="mono text-xs text-ink-soft mt-2">hit ↵ to transmit</div>
        </div>
      ) : (
        <ol className="space-y-6">
          {messages.map((m, i) => (
            <li key={i} className="fade-up">
              <Turn index={i} msg={m} />
            </li>
          ))}
          {pendingAssistant !== null && (
            <li className="fade-up">
              <Turn index={messages.length} msg={{ role: 'assistant', content: pendingAssistant }} typing />
            </li>
          )}
        </ol>
      )}
    </div>
  );
}

function Turn({ index, msg, typing }: { index: number; msg: ChatMsg; typing?: boolean }) {
  const isUser = msg.role === 'user';
  const n = String(index + 1).padStart(2, '0');
  return (
    <div className="grid grid-cols-[auto,1fr] gap-4">
      <div className="flex flex-col items-center gap-1 pt-1 select-none">
        <span className="mono text-[0.62rem] tracking-[0.2em] text-ink-soft">№{n}</span>
        <span className={cn(
          'mono text-[0.58rem] tracking-[0.22em] px-1.5 py-0.5 border',
          isUser ? 'bg-ink text-paper border-ink' : 'bg-vermilion text-paper border-vermilion',
        )}>
          {isUser ? 'YOU' : 'QWN'}
        </span>
        <div className={cn('w-px flex-1 mt-1', isUser ? 'bg-ink/20' : 'bg-vermilion/40')} />
      </div>
      <div className="min-w-0">
        <div className={cn('eyebrow mb-1', !isUser && 'text-vermilion')}>
          {isUser ? 'Friend speaks' : 'Model replies'}
        </div>
        <div
          className={cn(
            'whitespace-pre-wrap break-words',
            isUser
              ? 'display text-xl md:text-[1.35rem] leading-snug italic'
              : 'text-[0.98rem] leading-relaxed text-ink',
            !isUser && msg.content && 'drop-cap',
            typing && 'caret',
          )}
        >
          {msg.content || (typing ? '' : '')}
        </div>
      </div>
    </div>
  );
}
