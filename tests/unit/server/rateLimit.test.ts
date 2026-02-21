import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for rate limiting logic.
 * Tests the sliding window counter algorithm independently of Express.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(windowMs: number, max: number) {
  const store = new Map<string, RateLimitEntry>();

  return {
    store,
    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: max - 1, resetAt };
      }

      if (entry.count >= max) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count++;
      return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
    },
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    },
  };
}

describe('Rate Limiter', () => {
  it('should allow requests within the limit', () => {
    const limiter = createRateLimiter(60_000, 5);
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('user-1');
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const limiter = createRateLimiter(60_000, 3);
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');
    const result = limiter.check('user-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different keys independently', () => {
    const limiter = createRateLimiter(60_000, 2);
    limiter.check('user-1');
    limiter.check('user-1');
    const blocked = limiter.check('user-1');
    const allowed = limiter.check('user-2');
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('should reset after window expires', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(1_000, 2);

    limiter.check('user-1');
    limiter.check('user-1');
    expect(limiter.check('user-1').allowed).toBe(false);

    vi.advanceTimersByTime(1_100);
    expect(limiter.check('user-1').allowed).toBe(true);

    vi.useRealTimers();
  });

  it('should return correct remaining count', () => {
    const limiter = createRateLimiter(60_000, 5);
    expect(limiter.check('user-1').remaining).toBe(4);
    expect(limiter.check('user-1').remaining).toBe(3);
    expect(limiter.check('user-1').remaining).toBe(2);
  });

  it('should clean up stale entries', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(1_000, 10);

    limiter.check('user-1');
    limiter.check('user-2');
    expect(limiter.store.size).toBe(2);

    vi.advanceTimersByTime(1_100);
    limiter.cleanup();
    expect(limiter.store.size).toBe(0);

    vi.useRealTimers();
  });
});
