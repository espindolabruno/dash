const { test, expect } = require('@playwright/test');

test('sanity check - page loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Connect Agro/i);
});

test('sanity check - server returns mocked Google Drive clients via MSW', async ({ request }) => {
  const response = await request.get('/api/clients');
  expect(response.ok()).toBeTruthy();
  const clients = await response.json();
  expect(Array.isArray(clients)).toBeTruthy();
  expect(clients.length).toBeGreaterThan(0);
  expect(clients[0].name).toBe('AgroForte Sementes');
});

test('sanity check - server returns mocked Meta Ads insights via MSW', async ({ request }) => {
  const response = await request.get('/api/meta-insights?accountId=act_1034348999771083');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.campaigns).toBeDefined();
  expect(data.campaigns.length).toBeGreaterThan(0);
  expect(data.campaigns[0].campaign_name).toBe('Lançamento Soja 2026');
});
