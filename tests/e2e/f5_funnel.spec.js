const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F5: Video Funnel Charts', () => {

  test('TC-F5-01: Render 5-Step Video Funnel', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    // Select a video creative
    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    // Verify 5-step video watch funnel displays 5 segments
    const funnelSteps = page.locator('#video-funnel-chart .funnel-step');
    await expect(funnelSteps).toHaveCount(5);
  });

  test('TC-F5-02: Display Drop-off Math', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    // Inspect label between 50% and 75% steps
    const mathLabel = page.locator('#funnel-dropoff-50-75');
    await expect(mathLabel).toBeVisible();
    await expect(mathLabel).toContainText(/%/);
  });

  test('TC-F5-03: Video Chart Hover Tooltip', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    // Hover over 95% watch segment
    const segment95 = page.locator('#video-funnel-chart .funnel-step[data-step="95"]');
    await segment95.hover();

    const tooltip = page.locator('#funnel-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/views/i);
  });

  test('TC-F5-04: Toggle Views/Percentages', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    const segmentLabel = page.locator('#video-funnel-chart .funnel-step[data-step="100"] .step-label');
    await expect(segmentLabel).toContainText('%');

    // Click "Mostrar Valores Absolutos" toggle
    await page.click('#btn-toggle-funnel-values');
    await expect(segmentLabel).toContainText(/views/i);
  });

  test('TC-F5-05: Update Funnel on Client Change', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'Tratores Connect' });

    // Chart should refresh
    const chartTitle = page.locator('#video-funnel-chart .chart-title');
    await expect(chartTitle).toBeVisible();
  });

  test('TC-F5-06: Render Static Creative Fallback', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    // Select static image creative
    const staticCreative = page.locator('.creative-item[data-format="image"]').first();
    await staticCreative.click();

    const warning = page.locator('#video-funnel-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Formato estático - sem dados de vídeo');
  });

  test('TC-F5-07: Video Drop-off to Absolute Zero', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    // Select zero retention mock
    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'Tratores Connect' });
    
    // Choose specific video
    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    const step50 = page.locator('#video-funnel-chart .funnel-step[data-step="50"] .step-value');
    await expect(step50).toContainText('0');
  });

  test('TC-F5-08: Complete 100% Retention', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'AgroForte Sementes' });

    const videoCreative = page.locator('.creative-item[data-format="video"][data-mock="100-retention"]').first();
    await videoCreative.click();

    const step100 = page.locator('#video-funnel-chart .funnel-step[data-step="100"] .step-label');
    await expect(step100).toContainText('100%');
  });

  test('TC-F5-09: Video Play Count Exceeding Impressions', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const videoCreative = page.locator('.creative-item[data-format="video"][data-mock="exceed-impressions"]').first();
    await videoCreative.click();

    // The first step should be capped at 100% or displayed gracefully without clipping
    const step25 = page.locator('#video-funnel-chart .funnel-step[data-step="25"] .step-label');
    await expect(step25).toContainText('100%');
  });

  test('TC-F5-10: Negative Watch Time Input', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const videoCreative = page.locator('.creative-item[data-format="video"][data-mock="negative-input"]').first();
    await videoCreative.click();

    // Negative watch values should be handled as 0 views
    const step25 = page.locator('#video-funnel-chart .funnel-step[data-step="25"] .step-value');
    await expect(step25).toContainText('0');
  });

});
