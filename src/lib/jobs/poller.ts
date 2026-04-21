import { listPendingNotExpired, markSuccess, markFailed, type TaskRow } from '../db/tasks';
import { pollImage } from '../dashscope/image';
import { pollVideo } from '../dashscope/video';
import { AIKitError } from '../errors';

const POLL_INTERVAL_MS = 8_000;
const started = new Set<string>();

export function resumePendingTasks(): void {
  const pending = listPendingNotExpired();
  for (const row of pending) {
    if (!row.dashscope_id) continue;
    if (started.has(row.task_id)) continue;
    started.add(row.task_id);
    void pollInBackground(row);
  }
  if (pending.length > 0) console.log(`[resume] started polling for ${pending.length} pending tasks`);
}

async function pollInBackground(row: TaskRow): Promise<void> {
  while (Date.now() < row.expires_at) {
    await sleep(POLL_INTERVAL_MS);
    try {
      if (row.type === 'image') {
        const out = await pollImage(row.dashscope_id!);
        if (out.status === 'success') { markSuccess(row.task_id, out.urls); return; }
        if (out.status === 'failed') { markFailed(row.task_id, out.code, out.message); return; }
      } else {
        const out = await pollVideo(row.dashscope_id!);
        if (out.status === 'success') { markSuccess(row.task_id, [out.url]); return; }
        if (out.status === 'failed') { markFailed(row.task_id, out.code, out.message); return; }
      }
    } catch (err) {
      if (err instanceof AIKitError && err.code !== 'NETWORK_ERROR') {
        markFailed(row.task_id, err.code, err.message);
        return;
      }
    }
  }
  markFailed(row.task_id, 'UNKNOWN', 'expired before completion');
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
