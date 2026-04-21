import { pollImage } from '@/lib/dashscope/image';
import { getTask, markSuccess, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

type Deps = { pollImage?: typeof pollImage };

export async function handleImagePoll(taskId: string, deps: Deps = {}): Promise<Response> {
  const impl = deps.pollImage ?? pollImage;
  const row = getTask(taskId);
  if (!row || row.type !== 'image' || row.expires_at < Date.now()) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'not found' } }, { status: 404 });
  }
  if (row.status === 'success') {
    return Response.json({
      status: 'success',
      urls: JSON.parse(row.result_urls ?? '[]'),
      expiresAt: row.expires_at,
    });
  }
  if (row.status === 'failed') {
    return Response.json({
      status: 'failed',
      error: { code: row.error_code ?? 'UNKNOWN', message: row.error_message ?? 'failed' },
      expiresAt: row.expires_at,
    });
  }
  if (!row.dashscope_id) {
    return Response.json({ status: 'pending', expiresAt: row.expires_at });
  }
  try {
    const result = await impl(row.dashscope_id);
    if (result.status === 'success') {
      markSuccess(taskId, result.urls);
      return Response.json({ status: 'success', urls: result.urls, expiresAt: row.expires_at });
    }
    if (result.status === 'failed') {
      markFailed(taskId, result.code, result.message);
      return Response.json({
        status: 'failed',
        error: { code: result.code, message: result.message },
        expiresAt: row.expires_at,
      });
    }
    return Response.json({ status: 'pending', expiresAt: row.expires_at });
  } catch (err) {
    if (err instanceof AIKitError) {
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }): Promise<Response> {
  const { taskId } = await ctx.params;
  return handleImagePoll(taskId);
}
