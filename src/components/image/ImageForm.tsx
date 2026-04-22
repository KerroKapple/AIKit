'use client';
import { useState } from 'react';
import { useDict } from '@/app/_components/DictProvider';
import { ImageGallery } from './ImageGallery';
import { cn } from '@/lib/utils';
import { useSessionState } from '@/lib/hooks/useSessionState';

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
  const [state, setState] = useSessionState<State>('aikit:image:state', { kind: 'idle' }, {
    // 离开页面时 poll loop 已死，回来只保留 done/error，其它归零
    hydrate: (s) => (s.kind === 'done' || s.kind === 'error' ? s : { kind: 'idle' }),
  });

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
    <section className="grid gap-5">
      <header className="flex items-end justify-between gap-6 border-b border-ink pb-3">
        <div>
          <div className="eyebrow flex items-center gap-3">
            <span>Dispatch № 02</span>
            <span className="w-6 h-px bg-ink-soft" />
            <span>Still Image</span>
          </div>
          <h2 className="display text-4xl md:text-5xl font-semibold italic leading-tight mt-1">
            The <span className="text-vermilion">Plate</span> Press
          </h2>
        </div>
        <span className="chip chip-ink">WAN · v2.2</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px),1fr]">
        {/* 左 · 工单 */}
        <div className="paper-card p-5 space-y-6 relative">
          <span className="absolute -top-3 left-4 bg-paper px-2 mono text-[0.62rem] tracking-[0.22em] text-ink-soft">
            ORDER FORM · 02A
          </span>

          <Field label={dict.image.prompt} n="01">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={dict.image.promptPlaceholder}
              disabled={busy}
              rows={5}
              className="w-full bg-transparent resize-none outline-none font-sans text-base leading-relaxed placeholder:italic placeholder:text-ink-soft/50 border-b border-rule focus:border-ink pb-2 transition-colors"
            />
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label={dict.image.ratio} n="02">
              <ChipGroup value={ratio} options={RATIOS} onChange={(v) => setRatio(v)} disabled={busy} />
            </Field>
            <Field label={dict.image.batch} n="03">
              <ChipGroup
                value={String(batch)}
                options={BATCHES.map((b) => String(b)) as unknown as readonly string[]}
                onChange={(v) => setBatch(Number(v) as typeof batch)}
                disabled={busy}
              />
            </Field>
          </div>

          <button onClick={submit} disabled={busy || !prompt.trim()} className="ink-btn w-full justify-center">
            {busy ? dict.image.generating : dict.image.generate}
            <span aria-hidden>{busy ? '' : '◆'}</span>
          </button>

          {state.kind === 'error' && (
            <div className="text-sm mono text-vermilion-ink border border-vermilion/40 bg-vermilion/5 px-3 py-2">
              ⚠ {state.message}
            </div>
          )}
          {state.kind === 'polling' && (
            <div className="flex items-center gap-2 text-xs mono text-ink-soft">
              <span className="pulse-dot" /> exposing plate · task {state.taskId.slice(0, 8)}…
            </div>
          )}
        </div>

        {/* 右 · 版面 */}
        <div className="relative">
          <div className="eyebrow mb-3 flex items-center justify-between">
            <span>Plate · Gallery</span>
            <span>{state.kind === 'done' ? `${state.urls.length} EXPOSED` : '—— ——'}</span>
          </div>
          <div className={cn(
            'min-h-[360px] border border-ink p-4 bg-paper-deep/40',
            state.kind !== 'done' && 'hatch',
          )}>
            <ImageGallery urls={state.kind === 'done' ? state.urls : []} busy={busy} />
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

function ChipGroup<T extends string>({ value, options, onChange, disabled }: {
  value: T; options: readonly T[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o)}
            className={cn(
              'mono text-[0.72rem] tracking-[0.12em] px-2.5 py-1.5 border transition-colors',
              active ? 'bg-ink text-paper border-ink' : 'border-rule hover:border-ink',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
