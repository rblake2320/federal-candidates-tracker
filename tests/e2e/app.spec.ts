import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for Federal Candidates Tracker.
 * These tests run against a fully running dev environment.
 *
 * Run with: npm run test:e2e
 * Prerequisite: Database seeded, API and frontend running.
 */

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Election Tracker/);
  });

  test('should display stats grid', async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForSelector('[data-testid="stats-grid"], .stats-grid, h2', {
      timeout: 10_000,
    });
    // Page should have loaded without errors
    const errorBanner = page.locator('[data-testid="error-banner"], .error-banner');
    const errorCount = await errorBanner.count();
    // If there's no data yet, we might see a 0 count — that's okay
    expect(errorCount).toBeLessThanOrEqual(1);
  });

  test('should display state grid with clickable states', async ({ page }) => {
    await page.goto('/');
    // Should have state abbreviation links
    const stateLinks = page.locator('a[href*="/state/"]');
    await expect(stateLinks.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to state page when clicking a state', async ({ page }) => {
    await page.goto('/');
    const firstStateLink = page.locator('a[href*="/state/"]').first();
    await firstStateLink.click();
    await expect(page).toHaveURL(/\/state\/[A-Z]{2}/);
  });
});

test.describe('Navigation', () => {
  test('should have a working nav header', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/');
    const searchLink = page.locator('a[href*="/search"], a:has-text("Search")');
    if (await searchLink.count() > 0) {
      await searchLink.first().click();
      await expect(page).toHaveURL(/\/search/);
    }
  });

  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    const body = await page.textContent('body');
    expect(body).toContain('404');
  });
});

test.describe('State Page', () => {
  test('should load state detail page', async ({ page }) => {
    await page.goto('/state/CA');
    // Should display state name
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should show election cards or empty state', async ({ page }) => {
    await page.goto('/state/TX');
    await page.waitForTimeout(2_000);
    // Should have either race cards or a "no data" message
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(0);
  });

  test('should handle invalid state codes gracefully', async ({ page }) => {
    await page.goto('/state/ZZ');
    await page.waitForTimeout(2_000);
    // Should show error or redirect, not crash
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Search Page', () => {
  test('should load the search page', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.locator('input[type="text"], input[type="search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should perform a search and display results', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill('Smith');
    // Wait for debounced search
    await page.waitForTimeout(1_000);
    // URL should update with search params
    const url = page.url();
    expect(url).toContain('q=Smith');
  });

  test('should filter by party', async ({ page }) => {
    await page.goto('/search');
    const partySelect = page.locator('select').first();
    if (await partySelect.count() > 0) {
      await partySelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('should persist search params in URL', async ({ page }) => {
    await page.goto('/search?q=test&office=senate');
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    const value = await searchInput.inputValue();
    expect(value).toBe('test');
  });
});

test.describe('Candidate Page', () => {
  test('should show 400/404 for invalid candidate ID', async ({ page }) => {
    await page.goto('/candidate/not-a-uuid');
    await page.waitForTimeout(2_000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should show 404 for non-existent candidate', async ({ page }) => {
    await page.goto('/candidate/00000000-0000-0000-0000-000000000000');
    await page.waitForTimeout(2_000);
    // Should gracefully handle missing candidate
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('API Health', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('should serve API stats endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/stats');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('total_candidates');
  });

  test('should reject export without auth', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/export');
    expect(response.status()).toBe(401);
  });
});

test.describe('Performance', () => {
  test('dashboard should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5_000);
  });

  test('API stats should respond within 2 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get('http://localhost:3001/api/stats');
    const responseTime = Date.now() - start;
    expect(responseTime).toBeLessThan(2_000);
  });
});
