import { env } from '../env';
import { AIKitError, mapDashScopeError } from '../errors';
import { DASHSCOPE_COMPAT } from './client';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

const MODEL = 'qwen-turbo';

export async function* streamQwenChat(messages: ChatMessage[]): AsyncGenerator<string> {
  let resp: Response;
  try {
    resp = await fetch(`${DASHSCOPE_COMPAT}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
    });
  } catch (err) {
    throw new AIKitError('NETWORK_ERROR', (err as Error).message ?? 'fetch failed', err);
  }

  if (!resp.ok || !resp.body) {
    const payload = await resp.json().catch(() => ({}));
    throw mapDashScopeError(payload);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const raw of parts) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        if (payload === '[DONE]') return;
        continue;
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略解析失败的行（DashScope 插入的非 JSON 心跳）
      }
    }
  }
}
