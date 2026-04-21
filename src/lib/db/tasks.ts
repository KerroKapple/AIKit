import { randomUUID } from 'node:crypto';
import { getDb } from './client';

export const TASK_TTL_MS = 3 * 60 * 60 * 1000;

export type TaskType = 'image' | 'video';
export type TaskStatus = 'pending' | 'success' | 'failed';

export type TaskRow = {
  task_id: string;
  type: TaskType;
  provider: string;
  dashscope_id: string | null;
  status: TaskStatus;
  prompt: string;
  params: string | null;
  result_urls: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: number;
  expires_at: number;
};

export function createTask(input: {
  type: TaskType;
  provider: string;
  prompt: string;
  params: Record<string, unknown>;
}): TaskRow {
  const db = getDb();
  const now = Date.now();
  const row: TaskRow = {
    task_id: randomUUID(),
    type: input.type,
    provider: input.provider,
    dashscope_id: null,
    status: 'pending',
    prompt: input.prompt,
    params: JSON.stringify(input.params ?? {}),
    result_urls: null,
    error_code: null,
    error_message: null,
    created_at: now,
    expires_at: now + TASK_TTL_MS,
  };
  db.prepare(
    `INSERT INTO tasks (task_id,type,provider,dashscope_id,status,prompt,params,result_urls,error_code,error_message,created_at,expires_at)
     VALUES (@task_id,@type,@provider,@dashscope_id,@status,@prompt,@params,@result_urls,@error_code,@error_message,@created_at,@expires_at)`,
  ).run(row);
  return row;
}

export function getTask(taskId: string): TaskRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  return (row ?? null) as TaskRow | null;
}

export function setDashScopeId(taskId: string, dashscopeId: string): void {
  getDb().prepare('UPDATE tasks SET dashscope_id = ? WHERE task_id = ?').run(dashscopeId, taskId);
}

export function markSuccess(taskId: string, urls: string[]): void {
  getDb()
    .prepare("UPDATE tasks SET status = 'success', result_urls = ? WHERE task_id = ?")
    .run(JSON.stringify(urls), taskId);
}

export function markFailed(taskId: string, code: string, message: string): void {
  getDb()
    .prepare("UPDATE tasks SET status = 'failed', error_code = ?, error_message = ? WHERE task_id = ?")
    .run(code, message, taskId);
}

export function listPendingNotExpired(): TaskRow[] {
  const now = Date.now();
  return getDb()
    .prepare("SELECT * FROM tasks WHERE status = 'pending' AND expires_at > ?")
    .all(now) as TaskRow[];
}

export function listNotExpired(): TaskRow[] {
  const now = Date.now();
  return getDb()
    .prepare('SELECT * FROM tasks WHERE expires_at > ? ORDER BY created_at DESC, rowid DESC')
    .all(now) as TaskRow[];
}

export function deleteExpired(): number {
  const now = Date.now();
  return getDb().prepare('DELETE FROM tasks WHERE expires_at < ?').run(now).changes;
}
