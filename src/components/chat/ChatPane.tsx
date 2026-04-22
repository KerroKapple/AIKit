'use client';
import { useState } from 'react';
import { MessageList, type ChatMsg } from './MessageList';
import { ChatInput } from './ChatInput';
import { useDict } from '@/app/_components/DictProvider';
import { useSessionState } from '@/lib/hooks/useSessionState';

export function ChatPane() {
  const { dict } = useDict();
  const [messages, setMessages] = useSessionState<ChatMsg[]>('aikit:chat:messages', []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    setError(null);
    const next: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setPending('');
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody?.error?.code ?? 'UNKNOWN');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assistant = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const l of lines) {
          if (!l.startsWith('data:')) continue;
          const payload = l.slice(5).trim();
          if (!payload) continue;
          const evt = JSON.parse(payload) as { delta?: string; error?: { code: string }; done?: boolean };
          if (evt.error) { throw new Error(evt.error.code); }
          if (evt.delta) { assistant += evt.delta; setPending(assistant); }
        }
      }
      setMessages([...next, { role: 'assistant', content: assistant }]);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setError(dict.errors[code] ?? dict.errors.UNKNOWN);
    } finally {
      setPending(null);
    }
  };

  const clear = () => { setMessages([]); setError(null); };

  return (
    <section className="grid gap-5">
      {/* Section head */}
      <header className="flex items-end justify-between gap-6 border-b border-ink pb-3">
        <div>
          <div className="eyebrow flex items-center gap-3">
            <span>Dispatch № 01</span>
            <span className="w-6 h-px bg-ink-soft" />
            <span>Conversation</span>
          </div>
          <h2 className="display text-4xl md:text-5xl font-semibold italic leading-tight mt-1">
            The <span className="text-vermilion">Wire</span> Room
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span className="chip"><span className="pulse-dot mr-1.5" /> QWEN · STREAM</span>
          {messages.length > 0 && (
            <button onClick={clear} className="ghost-btn">Clear</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
        <div className="paper-card flex flex-col min-h-[60vh] max-h-[72vh]">
          <MessageList messages={messages} pendingAssistant={pending} />
          {error && (
            <div className="px-4 py-2 text-sm border-t border-vermilion/40 bg-vermilion/5 text-vermilion-ink mono">
              ⚠ {error}
            </div>
          )}
          <ChatInput onSend={send} disabled={pending !== null} />
        </div>

        {/* 侧边注脚 */}
        <aside className="hidden lg:flex flex-col gap-4 pt-2">
          <div>
            <div className="eyebrow mb-2">Marginalia</div>
            <p className="text-sm text-ink-soft leading-relaxed display italic">
              Type a question. Press <span className="mono not-italic text-ink">↵</span> to send,
              <span className="mono not-italic text-ink"> ⇧↵</span> for a new line.
              The line below you is a live transcript — it appears as the model types.
            </p>
          </div>
          <div className="border-t border-rule pt-4">
            <div className="eyebrow mb-2">Transcript</div>
            <dl className="grid grid-cols-2 gap-y-1 text-xs mono">
              <dt className="text-ink-soft">Turns</dt><dd className="text-right">{messages.length}</dd>
              <dt className="text-ink-soft">Status</dt>
              <dd className="text-right">{pending !== null ? 'transmitting' : 'idle'}</dd>
            </dl>
          </div>
          <div className="mt-auto border-t border-rule pt-4 text-xs mono text-ink-soft">
            § 01 · TXT<br/>
            No logs. No trace. Friends only.
          </div>
        </aside>
      </div>
    </section>
  );
}
