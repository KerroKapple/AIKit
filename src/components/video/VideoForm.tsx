'use client';
import { useState } from 'react';
import { useDict } from '@/app/_components/DictProvider';
import { VideoCard } from './VideoCard';
import { cn } from '@/lib/utils';
import { useSessionState } from '@/lib/hooks/useSessionState';

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
  const [state, setState] = useSessionState<State>('aikit:video:state', { kind: 'idle' }, {
    // poll loop 跨页面不续命，回来只保留终态
    hydrate: (s) => (s.kind === 'done' || s.kind === 'error' ? s : { kind: 'idle' }),
  });

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
    <section className="grid gap-5">
      <header className="flex items-end justify-between gap-6 border-b border-ink pb-3">
        <div>
          <div className="eyebrow flex items-center gap-3">
            <span>Dispatch № 03</span>
            <span className="w-6 h-px bg-ink-soft" />
            <span>Moving Image</span>
          </div>
          <h2 className="display text-4xl md:text-5xl font-semibold italic leading-tight mt-1">
            The <span className="text-vermilion">Cinema</span> Wing
          </h2>
        </div>
        <span className="chip chip-ink">KLING · WAN</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px),1fr]">
        <div className="paper-card p-5 space-y-6 relative">
          <span className="absolute -top-3 left-4 bg-paper px-2 mono text-[0.62rem] tracking-[0.22em] text-ink-soft">
            STORYBOARD · 03A
          </span>

          <Field label={dict.video.prompt} n="01">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={dict.video.promptPlaceholder}
              disabled={busy}
              rows={5}
              className="w-full bg-transparent resize-none outline-none font-sans text-base leading-relaxed placeholder:italic placeholder:text-ink-soft/50 border-b border-rule focus:border-ink pb-2 transition-colors"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={dict.video.duration} n="02">
              <ChipGroup value={String(duration)} options={DURATIONS.map(String)} onChange={(v) => setDuration(Number(v) as typeof duration)} disabled={busy} suffix="s" />
            </Field>
            <Field label={dict.video.resolution} n="03">
              <ChipGroup value={resolution} options={RESOLUTIONS as unknown as string[]} onChange={(v) => setResolution(v as typeof resolution)} disabled={busy} />
            </Field>
            <Field label={dict.video.aspectRatio} n="04">
              <ChipGroup value={ratio} options={RATIOS as unknown as string[]} onChange={(v) => setRatio(v as typeof ratio)} disabled={busy} />
            </Field>
          </div>

          <Field label={dict.video.firstFrame} n="05">
            <FileRow accept="image/*" disabled={busy}
              hasValue={!!firstFrame}
              onChange={(e) => onFirstFrame(e.target.files?.[0] ?? null)} />
          </Field>

          <Field label={dict.video.refImages} n="06">
            <FileRow accept="image/*" multiple disabled={busy}
              hasValue={refImages.length > 0}
              count={refImages.length}
              onChange={(e) => onRefImages(e.target.files)} />
            <p className="text-xs text-ink-soft italic display mt-1.5">{dict.video.refImagesHint}</p>
          </Field>

          <button onClick={submit} disabled={busy || !prompt.trim()} className="ink-btn w-full justify-center">
            {busy ? dict.video.generating : dict.video.generate}
            <span aria-hidden>{busy ? '' : '▶'}</span>
          </button>
        </div>

        <div>
          <div className="eyebrow mb-3 flex items-center justify-between">
            <span>Screening Room</span>
            <span>{card.status.toUpperCase()}</span>
          </div>
          <div className={cn(
            'border border-ink bg-ink text-paper min-h-[360px] p-4 relative overflow-hidden',
            card.status === 'idle' && 'bg-paper text-ink hatch',
          )}>
            <VideoCard {...card} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, n, children }: { label: string; n: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="mono text-[0.62rem] tracking-[0.22em] text-vermilion">№{n}</span>
        <span className="eyebrow">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ value, options, onChange, disabled, suffix }: {
  value: string; options: readonly string[]; onChange: (v: string) => void; disabled?: boolean; suffix?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o} type="button" disabled={disabled} onClick={() => onChange(o)}
            className={cn(
              'mono text-[0.72rem] tracking-[0.1em] px-2.5 py-1.5 border transition-colors',
              active ? 'bg-ink text-paper border-ink' : 'border-rule hover:border-ink',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {o}{suffix ?? ''}
          </button>
        );
      })}
    </div>
  );
}

function FileRow({ accept, multiple, disabled, hasValue, count, onChange }: {
  accept: string; multiple?: boolean; disabled?: boolean; hasValue: boolean; count?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={cn(
      'flex items-center gap-3 border border-dashed border-rule px-3 py-2 cursor-pointer hover:border-ink transition-colors',
      disabled && 'opacity-40 cursor-not-allowed',
      hasValue && 'border-ink border-solid bg-paper-deep',
    )}>
      <span className="mono text-[0.68rem] tracking-[0.2em] text-ink-soft">
        {hasValue ? (count ? `✓ ${count} FILE${count > 1 ? 'S' : ''}` : '✓ LOADED') : '+ ATTACH'}
      </span>
      <input type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={onChange} className="sr-only" />
      <span className="ml-auto mono text-[0.62rem] text-ink-soft">BROWSE</span>
    </label>
  );
}
