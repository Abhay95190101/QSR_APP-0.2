/**
 * Safe LocalStorage Utility with Quota Exceeded Protection
 * Prevents DOMException: QuotaExceededError crashes when storing large images or orders.
 */

// Helper to sanitize an object by stripping or truncating giant base64 data URLs (>30KB)
export function sanitizeForStorage<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  try {
    const copy = JSON.parse(JSON.stringify(obj));

    const cleanObject = (target: any) => {
      if (!target || typeof target !== 'object') return;
      for (const key of Object.keys(target)) {
        const val = target[key];
        if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 30000) {
          // If a base64 image is huge (>30KB), replace with placeholder or truncate to avoid quota crash
          target[key] = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';
        } else if (val && typeof val === 'object') {
          cleanObject(val);
        }
      }
    };

    cleanObject(copy);
    return copy;
  } catch {
    return obj;
  }
}

export const safeStorage = {
  getItem<T = any>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item);
    } catch {
      return fallback;
    }
  },

  getRaw(key: string, fallback: string = ''): string {
    if (typeof window === 'undefined') return fallback;
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  },

  setItem(key: string, value: any): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const stringified = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringified);
      return true;
    } catch (err: any) {
      console.warn(`[safeStorage] Quota exceeded or error saving "${key}":`, err);

      // Attempt Recovery Strategy 1: Sanitize giant base64 data URLs
      try {
        if (typeof value === 'object') {
          const sanitized = sanitizeForStorage(value);
          localStorage.setItem(key, JSON.stringify(sanitized));
          return true;
        }
      } catch {
        // Continue to Strategy 2
      }

      // Attempt Recovery Strategy 2: Clear old non-critical caches to free quota
      try {
        const nonCriticalKeys = [
          'sb_historical_day_ends',
          'sb_all_time_orders_archive',
          'sb_menu_categories',
        ];
        for (const k of nonCriticalKeys) {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        }
        const stringified = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringified);
        return true;
      } catch {
        // Silently fail without throwing uncaught exceptions to React
        return false;
      }
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // safe ignore
    }
  },
};
