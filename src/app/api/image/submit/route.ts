import { z } from 'zod';
import { submitImage } from '@/lib/dashscope/image';
import { createTask, setDashScopeId, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']),
  batchSize: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

type Deps = { submitImage?: typeof submitImage };

export async function handleImageSubmit(req: Request, deps: Deps = {}): Promise<Response> {
  const impl = deps.submitImage ?? submitImage;
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
  const task = createTask({ type: 'image', provider: 'wanx-image', prompt: p.prompt, params: p });
  try {
    const { dashscopeId } = await impl(p);
    setDashScopeId(task.task_id, dashscopeId);
    return Response.json({ taskId: task.task_id });
  } catch (err) {
    if (err instanceof AIKitError) {
      markFailed(task.task_id, err.code, err.message);
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  return handleImageSubmit(req);
}
