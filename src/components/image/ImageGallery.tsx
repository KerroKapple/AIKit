'use client';
import { useDict } from '@/app/_components/DictProvider';

export function ImageGallery({ urls, busy }: { urls: string[]; busy?: boolean }) {
  const { dict } = useDict();
  if (urls.length === 0) {
    return (
      <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-center">
        {busy ? (
          <>
            <span className="pulse-dot" />
            <p className="display italic text-2xl">Developing the plate…</p>
            <span className="mono text-[0.68rem] tracking-widest text-ink-soft uppercase">do not open the darkroom</span>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border border-rule flex items-center justify-center rotate-3">
              <span className="display italic text-3xl text-ink-soft">∅</span>
            </div>
            <p className="display italic text-xl text-ink-soft max-w-xs">{dict.image.empty}</p>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {urls.map((u, i) => (
        <figure key={i} className="fade-up group relative" style={{ animationDelay: `${i * 80}ms` }}>
          <a href={u} target="_blank" rel="noreferrer" className="block border border-ink bg-paper overflow-hidden">
            <img src={u} alt={`AIKit generated image ${i + 1}`} className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />
          </a>
          <figcaption className="flex items-center justify-between mt-1.5 mono text-[0.62rem] tracking-[0.22em] text-ink-soft uppercase">
            <span>Plate № {String(i + 1).padStart(2, '0')}</span>
            <a href={u} target="_blank" rel="noreferrer" className="hover:text-vermilion">Open ↗</a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
