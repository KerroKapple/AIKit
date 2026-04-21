import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  createTask, getTask, setDashScopeId, markSuccess, markFailed,
  listPendingNotExpired, listNotExpired, deleteExpired,
} from '@/lib/db/tasks';
import { getDb, closeDb } from '@/lib/db/client';

function resetDb() {
  closeDb();
  getDb();
}

beforeEach(resetDb);
afterAll(() => { closeDb(); });

describe('tasks db', () => {
  it('creates and reads a task', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a cat', params: { n: 2 } });
    expect(row.task_id).toBeTruthy();
    expect(row.status).toBe('pending');
    const read = getTask(row.task_id);
    expect(read?.prompt).toBe('a cat');
    expect(JSON.parse(read!.params!)).toEqual({ n: 2 });
  });

  it('stores dashscope id and marks success', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    setDashScopeId(row.task_id, 'ds-123');
    markSuccess(row.task_id, ['https://x/a.png', 'https://x/b.png']);
    const read = getTask(row.task_id)!;
    expect(read.dashscope_id).toBe('ds-123');
    expect(read.status).toBe('success');
    expect(JSON.parse(read.result_urls!)).toEqual(['https://x/a.png', 'https://x/b.png']);
  });

  it('marks failed with error', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    markFailed(row.task_id, 'CONTENT_POLICY', 'blocked');
    const read = getTask(row.task_id)!;
    expect(read.status).toBe('failed');
    expect(read.error_code).toBe('CONTENT_POLICY');
    expect(read.error_message).toBe('blocked');
  });

  it('listPendingNotExpired excludes expired and non-pending', () => {
    const fresh = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'a', params: {} });
    const done = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'b', params: {} });
    markSuccess(done.task_id, ['u']);
    const stale = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'c', params: {} });
    getDb().prepare('UPDATE tasks SET expires_at = ? WHERE task_id = ?').run(Date.now() - 1000, stale.task_id);

    const list = listPendingNotExpired();
    const ids = list.map((r) => r.task_id);
    expect(ids).toContain(fresh.task_id);
    expect(ids).not.toContain(done.task_id);
    expect(ids).not.toContain(stale.task_id);
  });

  it('listNotExpired returns all non-expired ordered by rowid desc', () => {
    const a = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a', params: {} });
    const b = createTask({ type: 'image', provider: 'wanx-image', prompt: 'b', params: {} });
    const list = listNotExpired();
    expect(list[0].task_id).toBe(b.task_id);
    expect(list[1].task_id).toBe(a.task_id);
  });

  it('deleteExpired removes only expired', () => {
    const fresh = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a', params: {} });
    const stale = createTask({ type: 'image', provider: 'wanx-image', prompt: 'b', params: {} });
    getDb().prepare('UPDATE tasks SET expires_at = ? WHERE task_id = ?').run(Date.now() - 1000, stale.task_id);
    const n = deleteExpired();
    expect(n).toBe(1);
    expect(getTask(fresh.task_id)).toBeTruthy();
    expect(getTask(stale.task_id)).toBeNull();
  });

  it('3h expiry default', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    const diff = row.expires_at - row.created_at;
    expect(diff).toBe(3 * 60 * 60 * 1000);
  });
});
