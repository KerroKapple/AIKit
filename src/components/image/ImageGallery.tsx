'use client';
import { useDict } from '@/app/_components/DictProvider';

export function ImageGallery({ urls }: { urls: string[] }) {
  const { dict } = useDict();
  if (urls.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">{dict.image.empty}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer" className="block border rounded-md overflow-hidden">
          <img src={u} alt={`result-${i}`} className="w-full h-auto" />
        </a>
      ))}
    </div>
  );
}
