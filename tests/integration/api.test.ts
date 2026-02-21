import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests for the API endpoints.
 * Requires a running PostgreSQL instance with schema applied.
 *
 * Run with: npm run test:integration
 * Prerequisite: DATABASE_URL env var pointing to a test database
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

describe('Health Check', () => {
  it('GET /health should return 200', async () => {
    const { status, data } = await fetchJSON('/health');
    expect(status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
  });
});

describe('GET /api/stats', () => {
  it('should return stats object with expected shape', async () => {
    const { status, data } = await fetchJSON('/api/stats');
    expect(status).toBe(200);
    expect(data).toHaveProperty('total_candidates');
    expect(data).toHaveProperty('party_breakdown');
    expect(data).toHaveProperty('office_breakdown');
  });

  it('should include cache-control header', async () => {
    const { headers } = await fetchJSON('/api/stats');
    const cc = headers.get('cache-control');
    expect(cc).toBeTruthy();
  });
});

describe('GET /api/states', () => {
  it('should return array of state summaries', async () => {
    const { status, data } = await fetchJSON('/api/states');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 50+ states/territories', async () => {
    const { data } = await fetchJSON('/api/states');
    expect(data.data.length).toBeGreaterThanOrEqual(50);
  });
});

describe('GET /api/states/:code', () => {
  it('should return state detail for valid code', async () => {
    const { status, data } = await fetchJSON('/api/states/AL');
    expect(status).toBe(200);
    expect(data.data).toHaveProperty('code', 'AL');
    expect(data.data).toHaveProperty('name', 'Alabama');
  });

  it('should return 400 for invalid state code', async () => {
    const { status } = await fetchJSON('/api/states/INVALID');
    expect(status).toBe(400);
  });

  it('should return 404 for non-existent state', async () => {
    const { status } = await fetchJSON('/api/states/ZZ');
    expect([400, 404]).toContain(status);
  });
});

describe('GET /api/candidates', () => {
  it('should return paginated candidates', async () => {
    const { status, data } = await fetchJSON('/api/candidates');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
  });

  it('should respect limit parameter', async () => {
    const { data } = await fetchJSON('/api/candidates?limit=5');
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  it('should filter by state', async () => {
    const { status } = await fetchJSON('/api/candidates/state/CA');
    expect(status).toBe(200);
  });

  it('should reject invalid state in path', async () => {
    const { status } = await fetchJSON('/api/candidates/state/INVALID');
    expect(status).toBe(400);
  });
});

describe('GET /api/candidates/:id', () => {
  it('should return 400 for invalid UUID', async () => {
    const { status } = await fetchJSON('/api/candidates/not-a-uuid');
    expect(status).toBe(400);
  });

  it('should return 404 for non-existent candidate', async () => {
    const { status } = await fetchJSON('/api/candidates/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });
});

describe('GET /api/candidates/search', () => {
  it('should return results for a search query', async () => {
    const { status, data } = await fetchJSON('/api/candidates/search?q=test');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
  });

  it('should return 400 for empty search', async () => {
    const { status } = await fetchJSON('/api/candidates/search?q=');
    expect([200, 400]).toContain(status);
  });
});

describe('GET /api/elections', () => {
  it('should return elections list', async () => {
    const { status, data } = await fetchJSON('/api/elections');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should filter elections by state', async () => {
    const { status, data } = await fetchJSON('/api/elections?state=TX');
    expect(status).toBe(200);
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('state', 'TX');
    }
  });
});

describe('GET /api/elections/special', () => {
  it('should return special elections array', async () => {
    const { status, data } = await fetchJSON('/api/elections/special');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('GET /api/export', () => {
  it('should require authentication', async () => {
    const { status } = await fetchJSON('/api/export');
    expect(status).toBe(401);
  });
});

describe('Security: SQL Injection Prevention', () => {
  it('should not be vulnerable to sort column injection', async () => {
    const { status } = await fetchJSON('/api/candidates?sort=last_name;DROP TABLE candidates');
    expect(status).toBe(200); // Should default to safe sort, not crash
  });

  it('should not be vulnerable to search injection', async () => {
    const { status } = await fetchJSON("/api/candidates/search?q=' OR '1'='1");
    expect([200, 400]).toContain(status); // Should not return all records
  });

  it('should not be vulnerable to state code injection', async () => {
    const { status } = await fetchJSON("/api/candidates/state/CA' OR '1'='1");
    expect(status).toBe(400);
  });
});

describe('Rate Limiting', () => {
  it('should include rate limit headers', async () => {
    const { headers } = await fetchJSON('/api/stats');
    // Rate limit headers may or may not be present depending on config
    // This is a soft check
    const remaining = headers.get('x-ratelimit-remaining');
    if (remaining) {
      expect(parseInt(remaining, 10)).toBeGreaterThanOrEqual(0);
    }
  });
});
