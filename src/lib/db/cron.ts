import { deleteExpired } from './tasks';

const CLEAN_INTERVAL_MS = 30 * 60 * 1000;

let handle: NodeJS.Timeout | null = null;

export function startCleanupCron(): void {
  if (handle) return;
  handle = setInterval(() => {
    try {
      const n = deleteExpired();
      if (n > 0) console.log(`[cron] deleted ${n} expired tasks`);
    } catch (err) {
      console.error('[cron] cleanup failed:', err);
    }
  }, CLEAN_INTERVAL_MS);
  if (handle.unref) handle.unref();
}

export function stopCleanupCron(): void {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
