'use client';
import { useState } from 'react';
import { MessageList, type ChatMsg } from './MessageList';
import { ChatInput } from './ChatInput';
import { useDict } from '@/app/_components/DictProvider';

export function ChatPane() {
  const { dict } = useDict();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg">
      <MessageList messages={messages} pendingAssistant={pending} />
      {error && <div className="px-3 py-2 text-sm text-destructive border-t">{error}</div>}
      <ChatInput onSend={send} disabled={pending !== null} />
    </div>
  );
}
