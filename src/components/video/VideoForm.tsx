'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useDict } from '@/app/_components/DictProvider';
import { VideoCard } from './VideoCard';

const DURATIONS = [5, 10] as const;
const RESOLUTIONS = ['720p', '1080p'] as const;
const RATIOS = ['16:9', '9:16', '1:1'] as const;
const POLL_INTERVAL = 5_000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'polling'; taskId: string; provider: string }
  | { kind: 'done'; videoUrl: string; provider: string }
  | { kind: 'error'; message: string; provider?: string };

export function VideoForm() {
  const { dict } = useDict();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(5);
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>('720p');
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('16:9');
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const onFirstFrame = async (f: File | null) => { setFirstFrame(f ? await fileToDataUrl(f) : null); };
  const onRefImages = async (fs: FileList | null) => {
    if (!fs) return setRefImages([]);
    const list = await Promise.all(Array.from(fs).slice(0, 4).map(fileToDataUrl));
    setRefImages(list);
  };

  const pollLoop = async (taskId: string, provider: string) => {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const resp = await fetch(`/api/video/${taskId}`);
      const body = await resp.json();
      if (!resp.ok) {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', provider, message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
      if (body.status === 'success') { setState({ kind: 'done', videoUrl: body.videoUrl, provider }); return; }
      if (body.status === 'failed') {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', provider, message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
    }
  };

  const submit = async () => {
    if (!prompt.trim()) return;
    setState({ kind: 'submitting' });
    try {
      const body: Record<string, unknown> = { prompt, duration, resolution, aspectRatio: ratio };
      if (firstFrame) body.firstFrame = firstFrame;
      if (refImages.length) body.refImages = refImages;
      const resp = await fetch('/api/video/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.code ?? 'UNKNOWN');
      setState({ kind: 'polling', taskId: data.taskId, provider: data.provider });
      pollLoop(data.taskId, data.provider);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setState({ kind: 'error', message: dict.errors[code] ?? dict.errors.UNKNOWN });
    }
  };

  const busy = state.kind === 'submitting' || state.kind === 'polling';
  const card =
    state.kind === 'done' ? { status: 'success' as const, videoUrl: state.videoUrl, provider: state.provider } :
    state.kind === 'polling' ? { status: 'pending' as const, provider: state.provider } :
    state.kind === 'error' ? { status: 'failed' as const, error: state.message, provider: state.provider } :
    { status: 'idle' as const };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>{dict.video.prompt}</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={dict.video.promptPlaceholder} className="min-h-[120px]" disabled={busy}/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{dict.video.duration}</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as typeof duration)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.video.resolution}</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESOLUTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.video.aspectRatio}</Label>
            <Select value={ratio} onValueChange={(v) => setRatio(v as typeof ratio)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RATIOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{dict.video.firstFrame}</Label>
          <input type="file" accept="image/*" disabled={busy}
            onChange={(e) => onFirstFrame(e.target.files?.[0] ?? null)}
            className="block text-sm" />
        </div>
        <div>
          <Label>{dict.video.refImages}</Label>
          <input type="file" accept="image/*" multiple disabled={busy}
            onChange={(e) => onRefImages(e.target.files)} className="block text-sm" />
          <p className="text-xs text-muted-foreground mt-1">{dict.video.refImagesHint}</p>
        </div>
        <Button onClick={submit} disabled={busy || !prompt.trim()} className="w-full">
          {busy ? dict.video.generating : dict.video.generate}
        </Button>
      </div>
      <div className="border rounded-lg p-4 min-h-[300px]">
        <VideoCard {...card} />
      </div>
    </div>
  );
}
