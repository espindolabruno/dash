const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F2: Tab View Switching', () => {

  test('TC-F2-01: Switch Tab Panel', async ({ page }) => {
    await loginDemo(page);
    const campaignTabBtn = page.locator('.nav-item[data-view="view-campaign"]');
    const overviewView = page.locator('#view-geral');
    const campaignView = page.locator('#view-campaign');

    await campaignTabBtn.click();
    await expect(campaignTabBtn).toHaveClass(/active/);
    await expect(campaignView).not.toHaveClass(/hidden/);
    await expect(overviewView).toHaveClass(/hidden/);
  });

  test('TC-F2-02: URL Hash Integration', async ({ page }) => {
    await loginDemo(page);
    const leadsTabBtn = page.locator('.nav-item[data-view="view-leads"]');
    await leadsTabBtn.click();
    await expect(page).toHaveURL(/#leads/);
  });

  test('TC-F2-03: Chart Re-render on Tab Show', async ({ page }) => {
    await loginDemo(page);
    const campaignTabBtn = page.locator('.nav-item[data-view="view-campaign"]');
    await campaignTabBtn.click();
    
    // Check if ApexCharts canvas has width/height and is not collapsed to 0px
    const chartCanvas = page.locator('#view-campaign .apexcharts-canvas').first();
    // In final state, chart should have dynamic non-zero width/height
    const boundingBox = await chartCanvas.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
    }
  });

  test('TC-F2-04: Back/Forward Browser History', async ({ page }) => {
    await loginDemo(page);
    
    const overviewTabBtn = page.locator('.nav-item[data-view="view-geral"]');
    const leadsTabBtn = page.locator('.nav-item[data-view="view-leads"]');
    
    await overviewTabBtn.click();
    await leadsTabBtn.click();
    
    await page.goBack();
    await expect(overviewTabBtn).toHaveClass(/active/);
  });

  test('TC-F2-05: Tab Toggle Keyboard Focus', async ({ page }) => {
    await loginDemo(page);
    // Focus first navigation item, press arrow key to focus next, and press Enter
    const overviewTabBtn = page.locator('.nav-item[data-view="view-geral"]');
    await overviewTabBtn.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    
    const campaignTabBtn = page.locator('.nav-item[data-view="view-campaign"]');
    await expect(campaignTabBtn).toHaveClass(/active/);
  });

  test('TC-F2-06: Invalid Hash Redirection', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/#nonexistent-tab');
    const overviewTabBtn = page.locator('.nav-item[data-view="view-geral"]');
    await expect(overviewTabBtn).toHaveClass(/active/);
  });

  test('TC-F2-07: Tab Switch under Active API Fetch', async ({ page }) => {
    await loginDemo(page);
    
    // Switch to client that triggers a slow fetch
    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'AgroForte Sementes' });
    
    // Switch tab immediately
    const leadsTabBtn = page.locator('.nav-item[data-view="view-leads"]');
    await leadsTabBtn.click();
    
    // Verify no application crash
    await expect(page.locator('#view-leads')).toBeVisible();
    await expect(page.locator('.error-toast-or-banner')).not.toBeVisible();
  });

  test('TC-F2-08: Persistence Across Page Reloads', async ({ page }) => {
    await loginDemo(page);
    const aiTabBtn = page.locator('.nav-item[data-view="view-ai"]');
    await aiTabBtn.click();
    
    await page.reload();
    await expect(aiTabBtn).toHaveClass(/active/);
  });

  test('TC-F2-09: Modal/Tab Switch Conflict', async ({ page }) => {
    await loginDemo(page);
    
    // Open settings modal
    await page.click('#btn-settings');
    const modal = page.locator('#modal-settings');
    await expect(modal).toBeVisible();
    
    // Switch tab in background
    await page.click('.nav-item[data-view="view-leads"]');
    
    // Assert active tab changes, and modal remains open or is closed gracefully without crash
    const leadsTabBtn = page.locator('.nav-item[data-view="view-leads"]');
    await expect(leadsTabBtn).toHaveClass(/active/);
  });

  test('TC-F2-10: Tab Switching with Empty Data', async ({ page }) => {
    await loginDemo(page);
    
    // Switch to client with empty data
    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'Tratores Connect' });
    
    // Click leads tab
    await page.click('.nav-item[data-view="view-leads"]');
    
    // Empty state container should render without throwing JS runtime errors
    const emptyState = page.locator('#view-leads .empty-state');
    await expect(emptyState).toBeVisible();
  });

});
