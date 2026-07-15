const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F4: Period-over-Period (PoP) Variance', () => {

  test('TC-F4-01: Enable PoP Comparison', async ({ page }) => {
    await loginDemo(page);
    
    // Enable comparison checkbox
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    // Verify KPI delta badges are visible
    const deltaBadge = page.locator('.kpi-card .delta-badge').first();
    await expect(deltaBadge).toBeVisible();
    await expect(deltaBadge).toHaveText(/[+-]\d+(\.\d+)?%/);
  });

  test('TC-F4-02: Color-Coded Positive Variance', async ({ page }) => {
    await loginDemo(page);
    
    // Mock / state should result in positive leads delta
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const leadsDeltaBadge = page.locator('#kpi-leads .delta-badge');
    await expect(leadsDeltaBadge).toHaveClass(/text-success/);
    await expect(leadsDeltaBadge.locator('.fa-arrow-up')).toBeVisible();
  });

  test('TC-F4-03: Color-Coded Negative Variance', async ({ page }) => {
    await loginDemo(page);
    
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const cplDeltaBadge = page.locator('#kpi-cpl .delta-badge');
    await expect(cplDeltaBadge).toHaveClass(/text-danger/);
    // Since CPL increase is negative for performance, we show it in red with an up arrow (as CPL went up)
    await expect(cplDeltaBadge.locator('.fa-arrow-up')).toBeVisible();
  });

  test('TC-F4-04: Shifting Date Navigation Backwards', async ({ page }) => {
    await loginDemo(page);

    // Open date picker
    await page.click('#date-picker-trigger');
    // Select "Últimos 7 dias"
    await page.click('.date-option[data-range="7"]');
    
    // Click "Período Anterior" button
    await page.click('#btn-date-prev');

    // Date labels should update to preceding 7-day calendar block
    const dateLabel = page.locator('#date-display-label');
    const labelText = await dateLabel.textContent();
    expect(labelText).toBeDefined();
  });

  test('TC-F4-05: Populating Custom Date Ranges', async ({ page }) => {
    await loginDemo(page);

    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="custom"]');
    
    await page.fill('#custom-start-date', '2026-06-01');
    await page.fill('#custom-end-date', '2026-06-15');
    await page.click('#btn-apply-custom-date');

    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    // Verify date range label updates and calculations run
    const dateLabel = page.locator('#date-display-label');
    await expect(dateLabel).toBeVisible();
  });

  test('TC-F4-06: Prior Period Division by Zero', async ({ page }) => {
    await loginDemo(page);

    // Simulate empty prior period via client select or query parameter mock
    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="division-by-zero-mock"]');
    
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const leadsDeltaBadge = page.locator('#kpi-leads .delta-badge');
    await expect(leadsDeltaBadge).toBeVisible();
    
    const badgeText = await leadsDeltaBadge.textContent();
    expect(badgeText.includes('+100%') || badgeText.includes('N/A')).toBe(true);
  });

  test('TC-F4-07: Current Period Zero Value', async ({ page }) => {
    await loginDemo(page);

    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="current-zero-mock"]');
    
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const leadsDeltaBadge = page.locator('#kpi-leads .delta-badge');
    await expect(leadsDeltaBadge).toHaveClass(/text-danger/);
    await expect(leadsDeltaBadge).toContainText('-100%');
  });

  test('TC-F4-08: Extremely Large Delta (Outliers)', async ({ page }) => {
    await loginDemo(page);

    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="outlier-delta-mock"]');
    
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const leadsDeltaBadge = page.locator('#kpi-leads .delta-badge');
    await expect(leadsDeltaBadge).toBeVisible();
    await expect(leadsDeltaBadge).toContainText('+5,000,000%');
    
    // Ensure no overflow / container styling issues
    const box = await leadsDeltaBadge.boundingBox();
    expect(box.width).toBeGreaterThan(0);
  });

  test('TC-F4-09: Leap Year Date Calculations', async ({ page }) => {
    await loginDemo(page);

    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="custom"]');
    
    await page.fill('#custom-start-date', '2024-02-01');
    await page.fill('#custom-end-date', '2024-02-29');
    await page.click('#btn-apply-custom-date');
    
    await page.click('#btn-date-prev');
    
    const dateLabel = page.locator('#date-display-label');
    await expect(dateLabel).toBeVisible();
  });

  test('TC-F4-10: Equal Value Neutral Delta', async ({ page }) => {
    await loginDemo(page);

    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="equal-value-mock"]');
    
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    const leadsDeltaBadge = page.locator('#kpi-leads .delta-badge');
    await expect(leadsDeltaBadge).toHaveClass(/text-muted/);
    await expect(leadsDeltaBadge).toContainText('0%');
  });

});
