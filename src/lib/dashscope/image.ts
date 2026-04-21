import type { AxiosInstance } from 'axios';
import { mapDashScopeError } from '../errors';
import { createSubmitClient, createPollClient } from './client';
import type { DashScopePollImageResp, DashScopeSubmitResp } from './types';

const MODEL = 'wan2.7-image-pro';
const SUBMIT_PATH = '/services/aigc/image-generation/generation';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type BatchSize = 1 | 2 | 3 | 4;

export type ImageParams = {
  prompt: string;
  aspectRatio: AspectRatio;
  batchSize: BatchSize;
};

const SIZE_BY_RATIO: Record<AspectRatio, string> = {
  '1:1': '1024*1024',
  '16:9': '1280*720',
  '9:16': '720*1280',
  '4:3': '1024*768',
  '3:4': '768*1024',
};

export async function submitImage(
  p: ImageParams,
  client: AxiosInstance = createSubmitClient(),
): Promise<{ dashscopeId: string }> {
  const body = {
    model: MODEL,
    input: { messages: [{ role: 'user', content: [{ text: p.prompt }] }] },
    parameters: { size: SIZE_BY_RATIO[p.aspectRatio], n: p.batchSize },
  };
  try {
    const resp = await client.post<DashScopeSubmitResp>(SUBMIT_PATH, body);
    return { dashscopeId: resp.data.output.task_id };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}

export type PollImageResult =
  | { status: 'pending' }
  | { status: 'success'; urls: string[] }
  | { status: 'failed'; code: string; message: string };

export async function pollImage(
  dashscopeId: string,
  client: AxiosInstance = createPollClient(),
): Promise<PollImageResult> {
  try {
    const resp = await client.get<DashScopePollImageResp>(`/tasks/${dashscopeId}`);
    const o = resp.data.output;
    if (o.task_status === 'PENDING' || o.task_status === 'RUNNING') {
      return { status: 'pending' };
    }
    if (o.task_status === 'SUCCEEDED') {
      const urls: string[] = [];
      for (const choice of o.choices ?? []) {
        for (const part of choice.message?.content ?? []) {
          if (part.image) urls.push(part.image);
        }
      }
      return { status: 'success', urls };
    }
    return { status: 'failed', code: o.code ?? 'UNKNOWN', message: o.message ?? 'failed' };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}
