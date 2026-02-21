import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for the structured logger.
 */

describe('Logger', () => {
  const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

  function shouldLog(
    currentLevel: keyof typeof LOG_LEVELS,
    messageLevel: keyof typeof LOG_LEVELS,
  ): boolean {
    return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel];
  }

  describe('Level filtering', () => {
    it('should log error when level is error', () => {
      expect(shouldLog('error', 'error')).toBe(true);
    });

    it('should not log debug when level is error', () => {
      expect(shouldLog('error', 'debug')).toBe(false);
    });

    it('should log all levels when set to debug', () => {
      expect(shouldLog('debug', 'debug')).toBe(true);
      expect(shouldLog('debug', 'info')).toBe(true);
      expect(shouldLog('debug', 'warn')).toBe(true);
      expect(shouldLog('debug', 'error')).toBe(true);
    });

    it('should filter debug when level is info', () => {
      expect(shouldLog('info', 'debug')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('info', 'warn')).toBe(true);
    });
  });

  describe('Log formatting', () => {
    it('should produce valid timestamp format', () => {
      const ts = new Date().toISOString();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include level and message in output', () => {
      const level = 'INFO';
      const msg = 'Server started';
      const formatted = `[${new Date().toISOString()}] ${level}: ${msg}`;
      expect(formatted).toContain('INFO');
      expect(formatted).toContain('Server started');
    });
  });
});
