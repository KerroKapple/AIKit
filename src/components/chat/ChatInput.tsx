'use client';
import { useState, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDict } from '@/app/_components/DictProvider';

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="flex gap-2 p-2 border-t">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} onKeyDown={onKey}
        placeholder={dict.chat.placeholder} className="min-h-[60px]" disabled={disabled}/>
      <Button onClick={submit} disabled={disabled || !v.trim()}>{dict.chat.send}</Button>
    </div>
  );
}
