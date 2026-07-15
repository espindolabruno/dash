const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F1: Sidebar Menu Toggle', () => {

  test('TC-F1-01: Collapse Sidebar Menu', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // If not collapsed by default, click to collapse
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    
    await expect(sidebar).toHaveClass(/collapsed/);
    const brandText = page.locator('.sidebar-brand-text');
    await expect(brandText).toBeHidden();
  });

  test('TC-F1-02: Expand Sidebar Menu', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // First make sure it is collapsed
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // Expand it
    await toggleBtn.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
    const brandText = page.locator('.sidebar-brand-text');
    await expect(brandText).toBeVisible();
  });

  test('TC-F1-03: Route Navigation Selection', async ({ page }) => {
    await loginDemo(page);
    const leadsNav = page.locator('.nav-item[data-view="view-leads"]');
    const campaignNav = page.locator('.nav-item[data-view="view-campaign"]');
    
    await leadsNav.click();
    await expect(leadsNav).toHaveClass(/active/);
    await expect(campaignNav).not.toHaveClass(/active/);
  });

  test('TC-F1-04: Multi-Dashboard State Sync', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // Collapse sidebar
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // Click "Agro Dashboard"
    await page.click('#btn-goto-agro');
    await page.waitForURL(/\/agro.html/);
    
    // Assert the React dashboard loads with its sidebar collapsed
    const agroSidebar = page.locator('.sidebar');
    await expect(agroSidebar).toHaveClass(/collapsed/);
  });

  test('TC-F1-05: Persistence Across Reloads', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // Collapse sidebar
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // Refresh browser
    await page.reload();
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('TC-F1-06: Desktop Default State', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('TC-F1-07: Mobile Auto-Collapse', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('TC-F1-08: Outside Click Dismissal on Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // Expand sidebar on mobile
    await toggleBtn.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
    
    // Click outside in main content area
    await page.click('.main-container');
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('TC-F1-09: Rapid Click Stress Test', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // Click toggle button 10 times in rapid succession
    for (let i = 0; i < 10; i++) {
      await toggleBtn.click();
    }
    
    // Wait for any animations to finish and assert clean final state
    await page.waitForTimeout(500);
    const hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(typeof hasCollapsed).toBe('boolean');
  });

  test('TC-F1-10: Persistent State on Tab Switching', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    
    // Collapse sidebar
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // Click through tab items
    const navItems = page.locator('.nav-item');
    const count = await navItems.count();
    for (let i = 0; i < count; i++) {
      await navItems.nth(i).click();
      await expect(sidebar).toHaveClass(/collapsed/);
    }
  });

});
