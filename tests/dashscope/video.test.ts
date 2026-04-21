import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { AxiosInstance } from 'axios';
import { routeVideoProvider, submitVideo, pollVideo, type VideoParams } from '@/lib/dashscope/video';

const fix = (p: string) => JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/providers', p), 'utf8'));

function makeClient(overrides: Partial<{ post: AxiosInstance['post']; get: AxiosInstance['get'] }>): AxiosInstance {
  return { post: overrides.post ?? vi.fn(), get: overrides.get ?? vi.fn() } as unknown as AxiosInstance;
}

describe('routeVideoProvider', () => {
  const base: VideoParams = { prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' };
  it('routes wanx-t2v when no first frame, no ref images', () => {
    expect(routeVideoProvider(base)).toBe('wanx-t2v');
  });
  it('routes kling-v3 when firstFrame present', () => {
    expect(routeVideoProvider({ ...base, firstFrame: 'https://x/a.png' })).toBe('kling-v3');
  });
  it('routes kling-v3-omni when refImages present', () => {
    expect(routeVideoProvider({ ...base, refImages: ['https://x/a.png'] })).toBe('kling-v3-omni');
  });
  it('refImages wins over firstFrame', () => {
    expect(routeVideoProvider({ ...base, firstFrame: 'x', refImages: ['y'] })).toBe('kling-v3-omni');
  });
});

describe('submitVideo', () => {
  it('t2v: posts wan2.7-t2v with size+duration', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('wanx-t2v/submit_success.json') });
    const out = await submitVideo(
      { prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' },
      makeClient({ post }),
    );
    expect(out.provider).toBe('wanx-t2v');
    expect(out.dashscopeId).toBe('wanx-t2v-FIXTURE_JOB_ID');
    const [, body] = post.mock.calls[0];
    expect(body.model).toBe('wan2.7-t2v');
    expect(body.input.prompt).toBe('x');
    expect(body.parameters.size).toBe('1280*720');
    expect(body.parameters.duration).toBe(5);
  });

  it('kling-v3: sends img_url on first frame', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('kling-v3/submit_success.json') });
    const out = await submitVideo(
      {
        prompt: 'x', duration: 5, resolution: '1080p', aspectRatio: '9:16',
        firstFrame: 'https://x/a.png',
      },
      makeClient({ post }),
    );
    expect(out.provider).toBe('kling-v3');
    expect(out.dashscopeId).toBe('kling-v3-FIXTURE_JOB_ID');
    const [, body] = post.mock.calls[0];
    expect(body.model).toBe('kling/kling-v3-video-generation');
    expect(body.input.img_url).toBe('https://x/a.png');
    expect(body.parameters.size).toBe('1080*1920');
  });

  it('kling-v3-omni: sends ref_images on refImages', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('kling-v3-omni/submit_success.json') });
    const out = await submitVideo(
      {
        prompt: 'x', duration: 10, resolution: '720p', aspectRatio: '1:1',
        refImages: ['https://x/a.png', 'https://x/b.png'],
      },
      makeClient({ post }),
    );
    expect(out.provider).toBe('kling-v3-omni');
    const [, body] = post.mock.calls[0];
    expect(body.model).toBe('kling/kling-v3-omni-video-generation');
    expect(body.input.ref_images).toEqual(['https://x/a.png', 'https://x/b.png']);
    expect(body.parameters.size).toBe('720*720');
    expect(body.parameters.duration).toBe(10);
  });

  it('kling-v3-omni caps ref_images at 4', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('kling-v3-omni/submit_success.json') });
    await submitVideo(
      {
        prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9',
        refImages: ['a', 'b', 'c', 'd', 'e'],
      },
      makeClient({ post }),
    );
    const [, body] = post.mock.calls[0];
    expect(body.input.ref_images).toHaveLength(4);
  });
});

describe('pollVideo', () => {
  it('returns success+url on SUCCEEDED', async () => {
    const get = vi.fn().mockResolvedValue({ data: fix('wanx-t2v/poll_success.json') });
    const out = await pollVideo('wanx-t2v-FIXTURE_JOB_ID', makeClient({ get }));
    expect(out.status).toBe('success');
    if (out.status === 'success') {
      expect(out.url).toMatch(/FIXTURE_VIDEO\.mp4$/);
    }
  });

  it('returns pending when PENDING', async () => {
    const get = vi.fn().mockResolvedValue({ data: { output: { task_id: 'x', task_status: 'PENDING' } } });
    const out = await pollVideo('x', makeClient({ get }));
    expect(out.status).toBe('pending');
  });

  it('returns failed+code on FAILED', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { output: { task_id: 'x', task_status: 'FAILED', code: 'DataInspectionFailed', message: 'blocked' } },
    });
    const out = await pollVideo('x', makeClient({ get }));
    expect(out.status).toBe('failed');
    if (out.status === 'failed') {
      expect(out.code).toBe('DataInspectionFailed');
    }
  });
});
