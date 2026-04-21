import { describe, it, expect } from 'vitest';
import { handleChat } from '@/app/api/chat/route';
import { AIKitError } from '@/lib/errors';

async function readSse(resp: Response): Promise<{ deltas: string[]; error?: string; done: boolean }> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const deltas: string[] = [];
  let error: string | undefined;
  let done = false;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buf += decoder.decode(chunk.value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const l of lines) {
      if (!l.startsWith('data:')) continue;
      const payload = l.slice(5).trim();
      if (!payload) continue;
      const parsed = JSON.parse(payload);
      if (parsed.delta) deltas.push(parsed.delta);
      if (parsed.error) error = parsed.error.code;
      if (parsed.done) done = true;
    }
  }
  return { deltas, error, done };
}

describe('handleChat', () => {
  it('proxies SSE stream from streamFn', async () => {
    async function* stream() { yield 'Hi'; yield ' there'; }
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const resp = await handleChat(req, stream);
    expect(resp.headers.get('content-type')).toMatch(/text\/event-stream/);
    const { deltas, done } = await readSse(resp);
    expect(deltas.join('')).toBe('Hi there');
    expect(done).toBe(true);
  });

  it('emits error event inside the stream with mapped code', async () => {
    async function* stream(): AsyncGenerator<string> {
      throw new AIKitError('CONTENT_POLICY', 'blocked');
      yield ''; // unreachable
    }
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }),
    });
    const resp = await handleChat(req, stream);
    expect(resp.status).toBe(200);
    const { error, deltas } = await readSse(resp);
    expect(error).toBe('CONTENT_POLICY');
    expect(deltas).toEqual([]);
  });

  it('400 on invalid body', async () => {
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notMessages: 'x' }),
    });
    const resp = await handleChat(req);
    expect(resp.status).toBe(400);
  });
});
