'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function MessageList({ messages, pendingAssistant }: { messages: ChatMsg[]; pendingAssistant: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAssistant]);
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div className={cn(
            'max-w-[70%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
            m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}>{m.content}</div>
        </div>
      ))}
      {pendingAssistant !== null && (
        <div className="flex justify-start">
          <div className="max-w-[70%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm bg-muted">
            {pendingAssistant || '…'}
          </div>
        </div>
      )}
    </div>
  );
}
