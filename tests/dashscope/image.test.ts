import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { AxiosInstance } from 'axios';
import { submitImage, pollImage } from '@/lib/dashscope/image';

const FIX = path.resolve('tests/fixtures/providers/wanx-image');
const loadFixture = (f: string) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));

function makeClient(overrides: Partial<{ post: AxiosInstance['post']; get: AxiosInstance['get'] }>): AxiosInstance {
  return { post: overrides.post ?? vi.fn(), get: overrides.get ?? vi.fn() } as unknown as AxiosInstance;
}

describe('submitImage', () => {
  it('returns dashscope task_id on success', async () => {
    const post = vi.fn().mockResolvedValue({ data: loadFixture('submit_success.json') });
    const out = await submitImage(
      { prompt: 'cat', aspectRatio: '16:9', batchSize: 2 },
      makeClient({ post }),
    );
    expect(out.dashscopeId).toBe('wanx-task-FIXTURE_JOB_ID');
    expect(post).toHaveBeenCalledTimes(1);
    const [, body] = post.mock.calls[0];
    expect(body.model).toBe('wan2.7-image-pro');
    expect(body.parameters.size).toBe('1280*720');
    expect(body.parameters.n).toBe(2);
  });

  it('throws CONTENT_POLICY when DataInspectionFailed at submit', async () => {
    const post = vi.fn().mockRejectedValue({
      response: { data: { code: 'DataInspectionFailed', message: 'blocked' } },
    });
    await expect(
      submitImage({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }, makeClient({ post })),
    ).rejects.toMatchObject({ code: 'CONTENT_POLICY' });
  });
});

describe('pollImage', () => {
  it('returns urls on success', async () => {
    const get = vi.fn().mockResolvedValue({ data: loadFixture('poll_success.json') });
    const out = await pollImage('wanx-task-FIXTURE_JOB_ID', makeClient({ get }));
    expect(out.status).toBe('success');
    if (out.status === 'success') {
      expect(out.urls).toEqual([
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/FIXTURE_IMAGE_1.png',
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/FIXTURE_IMAGE_2.png',
      ]);
    }
  });

  it('returns failed + code on DataInspectionFailed', async () => {
    const get = vi.fn().mockResolvedValue({ data: loadFixture('poll_failed_content_policy.json') });
    const out = await pollImage('wanx-task-FIXTURE_JOB_ID', makeClient({ get }));
    expect(out.status).toBe('failed');
    if (out.status === 'failed') {
      expect(out.code).toBe('DataInspectionFailed');
      expect(out.message).toMatch(/inappropriate/i);
    }
  });

  it('returns pending when PENDING', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { output: { task_id: 'x', task_status: 'PENDING' } },
    });
    const out = await pollImage('x', makeClient({ get }));
    expect(out.status).toBe('pending');
  });
});
