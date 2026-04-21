import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { handleImageSubmit } from '@/app/api/image/submit/route';
import { handleImagePoll } from '@/app/api/image/[taskId]/route';
import { getTask } from '@/lib/db/tasks';
import { getDb, closeDb } from '@/lib/db/client';
import { AIKitError } from '@/lib/errors';

function resetDb() { closeDb(); getDb(); }
beforeEach(resetDb);
afterAll(() => closeDb());

const submitReq = (body: unknown) => new Request('http://x/api/image/submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('handleImageSubmit', () => {
  it('persists task and returns taskId', async () => {
    const submitImage = vi.fn().mockResolvedValue({ dashscopeId: 'ds-123' });
    const resp = await handleImageSubmit(
      submitReq({ prompt: 'a cat', aspectRatio: '16:9', batchSize: 2 }),
      { submitImage },
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.taskId).toBeTruthy();
    const row = getTask(body.taskId)!;
    expect(row.dashscope_id).toBe('ds-123');
    expect(row.status).toBe('pending');
    expect(row.provider).toBe('wanx-image');
  });

  it('returns 400 on invalid body', async () => {
    const resp = await handleImageSubmit(submitReq({ prompt: '' }));
    expect(resp.status).toBe(400);
  });

  it('maps CONTENT_POLICY to 400 when submit throws', async () => {
    const submitImage = vi.fn().mockRejectedValue(new AIKitError('CONTENT_POLICY', 'blocked'));
    const resp = await handleImageSubmit(
      submitReq({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }),
      { submitImage },
    );
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error.code).toBe('CONTENT_POLICY');
  });
});

describe('handleImagePoll', () => {
  async function seed() {
    const submitImage = vi.fn().mockResolvedValue({ dashscopeId: 'ds-1' });
    const resp = await handleImageSubmit(
      submitReq({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }),
      { submitImage },
    );
    return (await resp.json()).taskId as string;
  }

  it('returns pending when still polling', async () => {
    const taskId = await seed();
    const pollImage = vi.fn().mockResolvedValue({ status: 'pending' });
    const resp = await handleImagePoll(taskId, { pollImage });
    const body = await resp.json();
    expect(body.status).toBe('pending');
  });

  it('writes urls on poll success and returns them', async () => {
    const taskId = await seed();
    const pollImage = vi.fn().mockResolvedValue({ status: 'success', urls: ['https://x/a.png'] });
    const resp = await handleImagePoll(taskId, { pollImage });
    const body = await resp.json();
    expect(body.status).toBe('success');
    expect(body.urls).toEqual(['https://x/a.png']);
    expect(getTask(taskId)!.status).toBe('success');
  });

  it('marks failed on poll failure', async () => {
    const taskId = await seed();
    const pollImage = vi.fn().mockResolvedValue({ status: 'failed', code: 'DataInspectionFailed', message: 'blocked' });
    const resp = await handleImagePoll(taskId, { pollImage });
    const body = await resp.json();
    expect(body.status).toBe('failed');
    expect(body.error.code).toBe('DataInspectionFailed');
    expect(getTask(taskId)!.status).toBe('failed');
  });

  it('returns 404 when task not found', async () => {
    const resp = await handleImagePoll('nope');
    expect(resp.status).toBe(404);
  });
});
