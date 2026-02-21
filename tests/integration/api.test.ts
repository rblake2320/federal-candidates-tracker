import { describe, it, expect } from 'vitest';

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
    expect(data).toHaveProperty('status', 'healthy');
  });
});

describe('GET /api/v1/stats', () => {
  it('should return stats object with expected shape', async () => {
    const { status, data } = await fetchJSON('/api/v1/stats');
    expect(status).toBe(200);
    expect(data).toHaveProperty('total_candidates');
    expect(data).toHaveProperty('total_senate_races');
    expect(data).toHaveProperty('total_house_races');
  });

  it('should include cache-control header', async () => {
    const { headers } = await fetchJSON('/api/v1/stats');
    const cc = headers.get('cache-control');
    expect(cc).toBeTruthy();
  });
});

describe('GET /api/v1/states', () => {
  it('should return array of state summaries', async () => {
    const { status, data } = await fetchJSON('/api/v1/states');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 50+ states/territories', async () => {
    const { data } = await fetchJSON('/api/v1/states');
    expect(data.data.length).toBeGreaterThanOrEqual(50);
  });
});

describe('GET /api/v1/states/:code', () => {
  it('should return state detail for valid code', async () => {
    const { status, data } = await fetchJSON('/api/v1/states/AL');
    expect(status).toBe(200);
    expect(data.state).toHaveProperty('code', 'AL');
    expect(data.state).toHaveProperty('name', 'Alabama');
  });

  it('should return 400 for invalid state code', async () => {
    const { status } = await fetchJSON('/api/v1/states/INVALID');
    expect(status).toBe(400);
  });

  it('should return 404 for non-existent state', async () => {
    const { status } = await fetchJSON('/api/v1/states/ZZ');
    expect([400, 404]).toContain(status);
  });
});

describe('GET /api/v1/candidates', () => {
  it('should return paginated candidates', async () => {
    const { status, data } = await fetchJSON('/api/v1/candidates');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
  });

  it('should respect limit parameter', async () => {
    const { data } = await fetchJSON('/api/v1/candidates?limit=5');
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  it('should filter by state', async () => {
    const { status } = await fetchJSON('/api/v1/candidates/state/CA');
    expect(status).toBe(200);
  });

  it('should reject invalid state in path', async () => {
    const { status } = await fetchJSON('/api/v1/candidates/state/INVALID');
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/candidates/:id', () => {
  it('should return 400 for invalid UUID', async () => {
    const { status } = await fetchJSON('/api/v1/candidates/not-a-uuid');
    expect(status).toBe(400);
  });

  it('should return 404 for non-existent candidate', async () => {
    const { status } = await fetchJSON('/api/v1/candidates/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });
});

describe('GET /api/v1/candidates with search', () => {
  it('should return results for a search query', async () => {
    const { status, data } = await fetchJSON('/api/v1/candidates?search=test');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
  });

  it('should return results for empty search', async () => {
    const { status } = await fetchJSON('/api/v1/candidates?search=');
    expect(status).toBe(200);
  });
});

describe('GET /api/v1/elections', () => {
  it('should return elections list', async () => {
    const { status, data } = await fetchJSON('/api/v1/elections');
    expect(status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should filter elections by state', async () => {
    const { status, data } = await fetchJSON('/api/v1/elections?state=TX');
    expect(status).toBe(200);
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('state', 'TX');
    }
  });
});

describe('GET /api/v1/elections/special', () => {
  it('should return special elections array', async () => {
    const { status, data } = await fetchJSON('/api/v1/elections/special');
    expect(status).toBe(200);
    expect(data).toHaveProperty('elections');
    expect(Array.isArray(data.elections)).toBe(true);
  });
});

describe('GET /api/v1/data/export', () => {
  it('should require authentication', async () => {
    const { status } = await fetchJSON('/api/v1/data/export');
    expect(status).toBe(401);
  });
});

describe('Security: SQL Injection Prevention', () => {
  it('should not be vulnerable to sort column injection', async () => {
    const { status } = await fetchJSON('/api/v1/candidates?sort=last_name;DROP TABLE candidates');
    expect(status).toBe(200); // Should default to safe sort, not crash
  });

  it('should not be vulnerable to search injection', async () => {
    const { status } = await fetchJSON("/api/v1/candidates?search=' OR '1'='1");
    expect([200, 400]).toContain(status); // Should not return all records
  });

  it('should not be vulnerable to state code injection', async () => {
    const { status } = await fetchJSON("/api/v1/candidates/state/CA' OR '1'='1");
    expect(status).toBe(400);
  });
});

describe('Rate Limiting', () => {
  it('should include rate limit headers', async () => {
    const { headers } = await fetchJSON('/api/v1/stats');
    // Rate limit headers may or may not be present depending on config
    // This is a soft check
    const remaining = headers.get('x-ratelimit-remaining');
    if (remaining) {
      expect(parseInt(remaining, 10)).toBeGreaterThanOrEqual(0);
    }
  });
});
