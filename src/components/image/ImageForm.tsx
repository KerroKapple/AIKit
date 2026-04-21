'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useDict } from '@/app/_components/DictProvider';
import { ImageGallery } from './ImageGallery';

const RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const BATCHES = [1, 2, 3, 4] as const;
const POLL_INTERVAL = 3_000;

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'polling'; taskId: string }
  | { kind: 'done'; urls: string[] }
  | { kind: 'error'; message: string };

export function ImageForm() {
  const { dict } = useDict();
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('1:1');
  const [batch, setBatch] = useState<(typeof BATCHES)[number]>(1);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const pollLoop = async (taskId: string) => {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const resp = await fetch(`/api/image/${taskId}`);
      const body = await resp.json();
      if (!resp.ok) {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
      if (body.status === 'success') { setState({ kind: 'done', urls: body.urls }); return; }
      if (body.status === 'failed') {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
    }
  };

  const submit = async () => {
    if (!prompt.trim()) return;
    setState({ kind: 'submitting' });
    try {
      const resp = await fetch('/api/image/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: ratio, batchSize: batch }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error?.code ?? 'UNKNOWN');
      setState({ kind: 'polling', taskId: body.taskId });
      pollLoop(body.taskId);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setState({ kind: 'error', message: dict.errors[code] ?? dict.errors.UNKNOWN });
    }
  };

  const busy = state.kind === 'submitting' || state.kind === 'polling';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>{dict.image.prompt}</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={dict.image.promptPlaceholder} className="min-h-[120px]" disabled={busy}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{dict.image.ratio}</Label>
            <Select value={ratio} onValueChange={(v) => setRatio(v as typeof ratio)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RATIOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.image.batch}</Label>
            <Select value={String(batch)} onValueChange={(v) => setBatch(Number(v) as typeof batch)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BATCHES.map((b) => <SelectItem key={b} value={String(b)}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={submit} disabled={busy || !prompt.trim()} className="w-full">
          {busy ? dict.image.generating : dict.image.generate}
        </Button>
        {state.kind === 'error' && <div className="text-sm text-destructive">{state.message}</div>}
      </div>
      <div className="border rounded-lg p-4 min-h-[300px]">
        <ImageGallery urls={state.kind === 'done' ? state.urls : []} />
      </div>
    </div>
  );
}
