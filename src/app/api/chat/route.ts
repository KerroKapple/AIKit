import { z } from 'zod';
import { streamQwenChat, type ChatMessage } from '@/lib/dashscope/chat';
import { AIKitError } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
});

type StreamFn = (messages: ChatMessage[]) => AsyncGenerator<string>;

export async function handleChat(req: Request, streamFn: StreamFn = streamQwenChat): Promise<Response> {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid json' } }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid body' } }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamFn(parsed.data.messages)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        const payload = err instanceof AIKitError
          ? err.toJSON()
          : { code: 'UNKNOWN', message: 'internal' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: payload })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  return handleChat(req);
}
