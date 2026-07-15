const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F7: Event Pixel API Fetching', () => {

  test('TC-F7-01: Submit Pixel Query', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    // Enter Pixel ID in settings
    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '1234567890');
    await page.click('#btn-save-settings');

    // Click "Carregar Eventos Pixel"
    await page.click('#btn-load-pixel-events');

    // Verify metrics are visible and show counts
    await expect(page.locator('#pixel-pageview-count')).toHaveText(/\d+/);
    await expect(page.locator('#pixel-lead-count')).toHaveText(/\d+/);
    await expect(page.locator('#pixel-purchase-count')).toHaveText(/\d+/);
  });

  test('TC-F7-02: Render Event Timeline', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-load-pixel-events');

    // Assert timeline chart is rendered
    const timeline = page.locator('#chart-pixel-timeline');
    await expect(timeline).toBeVisible();
  });

  test('TC-F7-03: Sync Date Parameters', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    // Select date range
    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="15"]');

    // Hook API request to verify parameters
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/pixel-events')),
      page.click('#btn-load-pixel-events')
    ]);

    const url = new URL(request.url());
    expect(url.searchParams.get('startDate')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url.searchParams.get('endDate')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('TC-F7-04: Discrepancy Margin Calculation', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-load-pixel-events');

    const discrepancyVal = page.locator('#discrepancy-margin-val');
    await expect(discrepancyVal).toBeVisible();
    await expect(discrepancyVal).toHaveText(/\d+%/);
  });

  test('TC-F7-05: Clear Fetch State', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-load-pixel-events');
    await expect(page.locator('#pixel-pageview-count')).toHaveText(/\d+/);

    // Clear state
    await page.click('#btn-clear-pixel-events');

    // Should return to "Nenhum dado consultado" placeholder state
    const placeholder = page.locator('#pixel-empty-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Nenhum dado consultado');
  });

  test('TC-F7-06: Validation of Empty Pixel ID', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    // Open settings, set Pixel ID to empty, save
    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '');
    await page.click('#btn-save-settings');

    await page.click('#btn-load-pixel-events');

    const pixelInput = page.locator('#input-pixel-id');
    await expect(pixelInput).toHaveClass(/border-red|error/);

    const errorMessage = page.locator('#pixel-id-validation-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Insira um ID de Pixel válido');
  });

  test('TC-F7-07: Invalid Non-Numeric Pixel ID', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', 'PixelAgro');
    await page.click('#btn-save-settings');

    await page.click('#btn-load-pixel-events');

    const toast = page.locator('.error-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('ID do Pixel precisa ser apenas números');
  });

  test('TC-F7-08: Mocking API Timeout (504)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '9999999999'); // Trigger mock timeout ID
    await page.click('#btn-save-settings');

    await page.click('#btn-load-pixel-events');

    const loaderMessage = page.locator('#pixel-error-message');
    await expect(loaderMessage).toBeVisible();
    await expect(loaderMessage).toContainText('Tempo limite esgotado. Verifique a conexão com a Meta API');
  });

  test('TC-F7-09: Mocking API Bad Request (400)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '400400400'); // Trigger mock bad request ID
    await page.click('#btn-save-settings');

    await page.click('#btn-load-pixel-events');

    const errorMessage = page.locator('#pixel-error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Pixel inativo ou não cadastrado');
  });

  test('TC-F7-10: Discrepancy Margin Extreme Bounds', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-events"]');

    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '100100100'); // Trigger mock 100% discrepancy ID
    await page.click('#btn-save-settings');

    await page.click('#btn-load-pixel-events');

    const discrepancyVal = page.locator('#discrepancy-margin-val');
    await expect(discrepancyVal).toHaveText('100%');
    await expect(page.locator('#pixel-discrepancy-card')).toHaveClass(/discrepancy-warning-high/);
  });

});
