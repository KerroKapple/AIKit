import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { handleVideoSubmit } from '@/app/api/video/submit/route';
import { handleVideoPoll } from '@/app/api/video/[taskId]/route';
import { getTask } from '@/lib/db/tasks';
import { getDb, closeDb } from '@/lib/db/client';

function resetDb() { closeDb(); getDb(); }
beforeEach(resetDb);
afterAll(() => closeDb());

const submitReq = (body: unknown) => new Request('http://x/api/video/submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('handleVideoSubmit', () => {
  it('persists task with provider from router (kling-v3 on firstFrame)', async () => {
    const submitVideo = vi.fn().mockResolvedValue({ dashscopeId: 'ds-v1', provider: 'kling-v3' });
    const resp = await handleVideoSubmit(
      submitReq({
        prompt: 'a cat', duration: 5, resolution: '720p', aspectRatio: '16:9',
        firstFrame: 'https://x/a.png',
      }),
      { submitVideo },
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.taskId).toBeTruthy();
    expect(body.provider).toBe('kling-v3');
    const row = getTask(body.taskId)!;
    expect(row.provider).toBe('kling-v3');
    expect(row.dashscope_id).toBe('ds-v1');
  });

  it('returns 400 on invalid body', async () => {
    const resp = await handleVideoSubmit(submitReq({ prompt: '' }));
    expect(resp.status).toBe(400);
  });
});

describe('handleVideoPoll', () => {
  async function seed() {
    const submitVideo = vi.fn().mockResolvedValue({ dashscopeId: 'ds-v1', provider: 'wanx-t2v' });
    const resp = await handleVideoSubmit(
      submitReq({ prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' }),
      { submitVideo },
    );
    return (await resp.json()).taskId as string;
  }

  it('returns success+videoUrl on poll success', async () => {
    const taskId = await seed();
    const pollVideo = vi.fn().mockResolvedValue({ status: 'success', url: 'https://x/v.mp4' });
    const resp = await handleVideoPoll(taskId, { pollVideo });
    const body = await resp.json();
    expect(body.status).toBe('success');
    expect(body.videoUrl).toBe('https://x/v.mp4');
    expect(body.provider).toBe('wanx-t2v');
  });

  it('returns 404 when task not found', async () => {
    const resp = await handleVideoPoll('nope');
    expect(resp.status).toBe(404);
  });
});
