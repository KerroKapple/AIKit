'use client';
import { useDict } from '@/app/_components/DictProvider';

export function VideoCard({
  status, provider, videoUrl, error,
}: {
  status: 'pending' | 'success' | 'failed' | 'idle';
  provider?: string;
  videoUrl?: string;
  error?: string;
}) {
  const { dict } = useDict();

  if (status === 'idle') {
    return (
      <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-20 h-12 border border-rule flex items-center justify-center">
          <span className="display italic text-2xl text-ink-soft">▶</span>
        </div>
        <p className="display italic text-xl text-ink-soft max-w-xs">{dict.video.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between text-[0.62rem] mono tracking-[0.22em] uppercase text-paper/60">
        <span>REEL № 001</span>
        {provider && <span className="text-vermilion">{dict.video.providerLabel}: {provider}</span>}
      </div>

      {status === 'pending' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5">
            <span className="pulse-dot" />
            <span className="pulse-dot" style={{ animationDelay: '0.2s' }} />
            <span className="pulse-dot" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="display italic text-2xl">{dict.video.generating}</p>
          <span className="mono text-[0.68rem] tracking-widest text-paper/50">reel threading · please hold</span>
        </div>
      )}

      {status === 'success' && videoUrl && (
        <div className="flex-1 flex flex-col">
          <div className="relative border border-paper/20">
            {/* 穿孔装饰 */}
            <div className="absolute inset-y-0 left-0 w-3 flex flex-col justify-around py-1 bg-paper/5">
              {Array.from({ length: 8 }).map((_, i) => <span key={i} className="w-1.5 h-1.5 bg-paper/30 rounded-full mx-auto" />)}
            </div>
            <div className="absolute inset-y-0 right-0 w-3 flex flex-col justify-around py-1 bg-paper/5">
              {Array.from({ length: 8 }).map((_, i) => <span key={i} className="w-1.5 h-1.5 bg-paper/30 rounded-full mx-auto" />)}
            </div>
            <video src={videoUrl} controls aria-label="Generated video" className="w-full block relative z-10 px-3" />
          </div>
          <a href={videoUrl} target="_blank" rel="noreferrer"
             className="mt-3 inline-flex items-center gap-2 self-end mono text-[0.68rem] tracking-[0.2em] uppercase text-paper/80 hover:text-vermilion transition-colors">
            Open full reel ↗
          </a>
        </div>
      )}

      {status === 'failed' && error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="chip chip-vermilion">ROLL DAMAGED</span>
          <p className="text-sm mono text-paper/80 max-w-xs text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
