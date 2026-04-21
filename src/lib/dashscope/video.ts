import type { AxiosInstance } from 'axios';
import { mapDashScopeError } from '../errors';
import { createSubmitClient, createPollClient } from './client';
import type { DashScopePollVideoResp, DashScopeSubmitResp } from './types';

const SUBMIT_PATH = '/services/aigc/video-generation/video-synthesis';

export type VideoProvider = 'wanx-t2v' | 'kling-v3' | 'kling-v3-omni';

export type VideoDuration = 5 | 10;
export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type VideoParams = {
  prompt: string;
  duration: VideoDuration;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  firstFrame?: string;
  refImages?: string[];
};

const MODEL_BY_PROVIDER: Record<VideoProvider, string> = {
  'wanx-t2v': 'wan2.7-t2v',
  'kling-v3': 'kling/kling-v3-video-generation',
  'kling-v3-omni': 'kling/kling-v3-omni-video-generation',
};

const SIZE_MATRIX: Record<VideoResolution, Record<VideoAspectRatio, string>> = {
  '720p': { '16:9': '1280*720', '9:16': '720*1280', '1:1': '720*720' },
  '1080p': { '16:9': '1920*1080', '9:16': '1080*1920', '1:1': '1080*1080' },
};

const KLING_OMNI_MAX_REF = 4;

export function routeVideoProvider(p: VideoParams): VideoProvider {
  if (p.refImages && p.refImages.length > 0) return 'kling-v3-omni';
  if (p.firstFrame) return 'kling-v3';
  return 'wanx-t2v';
}

export async function submitVideo(
  p: VideoParams,
  client: AxiosInstance = createSubmitClient(),
): Promise<{ dashscopeId: string; provider: VideoProvider }> {
  const provider = routeVideoProvider(p);
  const size = SIZE_MATRIX[p.resolution][p.aspectRatio];

  const input: Record<string, unknown> = { prompt: p.prompt };
  if (provider === 'kling-v3' && p.firstFrame) input.img_url = p.firstFrame;
  if (provider === 'kling-v3-omni' && p.refImages) {
    input.ref_images = p.refImages.slice(0, KLING_OMNI_MAX_REF);
  }

  const body = {
    model: MODEL_BY_PROVIDER[provider],
    input,
    parameters: { size, duration: p.duration },
  };

  try {
    const resp = await client.post<DashScopeSubmitResp>(SUBMIT_PATH, body);
    return { dashscopeId: resp.data.output.task_id, provider };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}

export type PollVideoResult =
  | { status: 'pending' }
  | { status: 'success'; url: string }
  | { status: 'failed'; code: string; message: string };

export async function pollVideo(
  dashscopeId: string,
  client: AxiosInstance = createPollClient(),
): Promise<PollVideoResult> {
  try {
    const resp = await client.get<DashScopePollVideoResp>(`/tasks/${dashscopeId}`);
    const o = resp.data.output;
    if (o.task_status === 'PENDING' || o.task_status === 'RUNNING') {
      return { status: 'pending' };
    }
    if (o.task_status === 'SUCCEEDED') {
      return { status: 'success', url: o.video_url ?? '' };
    }
    return { status: 'failed', code: o.code ?? 'UNKNOWN', message: o.message ?? 'failed' };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}
