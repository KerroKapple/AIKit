import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamQwenChat } from '@/lib/dashscope/chat';

function mockFetchSse(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
}

afterEach(() => { vi.restoreAllMocks(); });

describe('streamQwenChat', () => {
  it('yields deltas from SSE', async () => {
    globalThis.fetch = mockFetchSse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]) as unknown as typeof fetch;
    const out: string[] = [];
    for await (const d of streamQwenChat([{ role: 'user', content: 'hi' }])) out.push(d);
    expect(out.join('')).toBe('Hello world');
  });

  it('throws mapped AIKitError on 401 InvalidApiKey', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'InvalidApiKey', message: 'bad key' }), { status: 401 }),
    ) as unknown as typeof fetch;
    const gen = streamQwenChat([{ role: 'user', content: 'hi' }]);
    await expect(async () => { for await (const _ of gen) { void _; } }).rejects.toMatchObject({
      name: 'AIKitError', code: 'INVALID_KEY',
    });
  });

  it('throws CONTENT_POLICY on DataInspectionFailed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'DataInspectionFailed', message: 'blocked' }), { status: 400 }),
    ) as unknown as typeof fetch;
    const gen = streamQwenChat([{ role: 'user', content: 'hi' }]);
    await expect(async () => { for await (const _ of gen) { void _; } }).rejects.toMatchObject({
      code: 'CONTENT_POLICY',
    });
  });

  it('ignores malformed data lines', async () => {
    globalThis.fetch = mockFetchSse([
      'data: not-json\n\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n\n',
    ]) as unknown as typeof fetch;
    const out: string[] = [];
    for await (const d of streamQwenChat([{ role: 'user', content: 'x' }])) out.push(d);
    expect(out.join('')).toBe('ok');
  });
});
