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
    return <div className="text-sm text-muted-foreground py-8 text-center">{dict.video.empty}</div>;
  }
  return (
    <div className="space-y-2">
      {provider && <div className="text-xs text-muted-foreground">{dict.video.providerLabel}: {provider}</div>}
      {status === 'pending' && <div className="text-sm">{dict.video.generating}</div>}
      {status === 'success' && videoUrl && (
        <video src={videoUrl} controls className="w-full rounded-md" />
      )}
      {status === 'failed' && error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
}
