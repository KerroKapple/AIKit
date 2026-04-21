import { startCleanupCron } from './db/cron';
import { resumePendingTasks } from './jobs/poller';
import { getDb } from './db/client';

let booted = false;

export function bootOnce(): void {
  if (booted) return;
  booted = true;
  getDb();
  startCleanupCron();
  resumePendingTasks();
  console.log('[boot] cron + resume started');
}
