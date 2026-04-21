import { pollVideo } from '@/lib/dashscope/video';
import { getTask, markSuccess, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

type Deps = { pollVideo?: typeof pollVideo };

export async function handleVideoPoll(taskId: string, deps: Deps = {}): Promise<Response> {
  const impl = deps.pollVideo ?? pollVideo;
  const row = getTask(taskId);
  if (!row || row.type !== 'video' || row.expires_at < Date.now()) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'not found' } }, { status: 404 });
  }
  if (row.status === 'success') {
    const urls = JSON.parse(row.result_urls ?? '[]') as string[];
    return Response.json({
      status: 'success',
      videoUrl: urls[0] ?? '',
      provider: row.provider,
      expiresAt: row.expires_at,
    });
  }
  if (row.status === 'failed') {
    return Response.json({
      status: 'failed',
      error: { code: row.error_code ?? 'UNKNOWN', message: row.error_message ?? 'failed' },
      provider: row.provider,
      expiresAt: row.expires_at,
    });
  }
  if (!row.dashscope_id) {
    return Response.json({ status: 'pending', provider: row.provider, expiresAt: row.expires_at });
  }
  try {
    const result = await impl(row.dashscope_id);
    if (result.status === 'success') {
      markSuccess(taskId, [result.url]);
      return Response.json({
        status: 'success',
        videoUrl: result.url,
        provider: row.provider,
        expiresAt: row.expires_at,
      });
    }
    if (result.status === 'failed') {
      markFailed(taskId, result.code, result.message);
      return Response.json({
        status: 'failed',
        error: { code: result.code, message: result.message },
        provider: row.provider,
        expiresAt: row.expires_at,
      });
    }
    return Response.json({ status: 'pending', provider: row.provider, expiresAt: row.expires_at });
  } catch (err) {
    if (err instanceof AIKitError) {
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }): Promise<Response> {
  const { taskId } = await ctx.params;
  return handleVideoPoll(taskId);
}
