import { z } from 'zod';
import { submitVideo, routeVideoProvider } from '@/lib/dashscope/video';
import { createTask, setDashScopeId, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  duration: z.union([z.literal(5), z.literal(10)]),
  resolution: z.enum(['720p', '1080p']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  firstFrame: z.string().optional(),
  refImages: z.array(z.string()).max(4).optional(),
});

type Deps = { submitVideo?: typeof submitVideo };

export async function handleVideoSubmit(req: Request, deps: Deps = {}): Promise<Response> {
  const impl = deps.submitVideo ?? submitVideo;
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid json' } }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid body' } }, { status: 400 });
  }
  const p = parsed.data;
  const provider = routeVideoProvider(p);
  const task = createTask({ type: 'video', provider, prompt: p.prompt, params: p });
  try {
    const { dashscopeId } = await impl(p);
    setDashScopeId(task.task_id, dashscopeId);
    return Response.json({ taskId: task.task_id, provider });
  } catch (err) {
    if (err instanceof AIKitError) {
      markFailed(task.task_id, err.code, err.message);
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  return handleVideoSubmit(req);
}
