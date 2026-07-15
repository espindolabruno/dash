const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('Tier 3: Cross-Feature Combinations', () => {

  test('TC-COM-01: Sidebar Collapsed Tab Resize (F1 + F2)', async ({ page }) => {
    await loginDemo(page);
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    const campaignTabBtn = page.locator('.nav-item[data-view="view-campaign"]');
    const overviewTabBtn = page.locator('.nav-item[data-view="view-geral"]');

    // 1. Collapse sidebar
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // 2. Switch to Campaign tab
    await campaignTabBtn.click();
    await expect(page.locator('#view-campaign')).not.toHaveClass(/hidden/);

    // 3. Expand sidebar
    await toggleBtn.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // 4. Switch back to Overview
    await overviewTabBtn.click();
    await expect(page.locator('#view-geral')).not.toHaveClass(/hidden/);
  });

  test('TC-COM-02: Tab Switch Spreadsheet State Retention (F2 + F6)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    // Paginate spreadsheet to Page 3
    const page3Btn = page.locator('#leads-pagination-page-3');
    if (await page3Btn.isVisible()) {
      await page3Btn.click();
    } else {
      await page.click('#leads-pagination-next');
      await page.click('#leads-pagination-next');
    }

    const pageLabel = page.locator('#leads-page-label');
    await expect(pageLabel).toContainText('Página 3');

    // Click Overview tab
    await page.click('.nav-item[data-view="view-geral"]');
    await expect(page.locator('#view-geral')).toBeVisible();

    // Click Leads tab again
    await page.click('.nav-item[data-view="view-leads"]');
    // Verify page 3 is still active
    await expect(pageLabel).toContainText('Página 3');
  });

  test('TC-COM-03: Drag & Drop Comparison with PoP Metrics (F3 + F4)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard1 = page.locator('.campaign-card').nth(0);
    const campaignCard2 = page.locator('.campaign-card').nth(1);
    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');

    await campaignCard1.dragTo(slotA);
    await campaignCard2.dragTo(slotB);

    // Toggle "Compara com período anterior"
    const popCheckbox = page.locator('#chk-compare-pop');
    await popCheckbox.check();

    // Verify comparison table displays PoP percentage variance indicators for both items
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).toBeVisible();
    
    const popDeltas = comparisonTable.locator('.delta-badge');
    await expect(popDeltas).toHaveCount(2);
  });

  test('TC-COM-04: Creative Table Lightbox Video Funnel Shortcut (F5 + F6)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    // Click ad thumbnail to open preview modal
    const thumbnail = page.locator('#leads-spreadsheet-table tbody tr img.ad-thumbnail').first();
    await thumbnail.click();

    const lightbox = page.locator('#modal-lightbox');
    await expect(lightbox).toBeVisible();

    // Click "Diagnóstico de Funil de Vídeo" link in modal
    await lightbox.locator('#btn-lightbox-video-funnel-shortcut').click();

    // Lightbox closes
    await expect(lightbox).not.toBeVisible();

    // Page switches to Campaign tab
    const campaignTabBtn = page.locator('.nav-item[data-view="view-campaign"]');
    await expect(campaignTabBtn).toHaveClass(/active/);

    // Video funnel chart is pre-filtered for that creative
    const funnelTitle = page.locator('#video-funnel-chart .chart-title');
    await expect(funnelTitle).toContainText(/Lançamento Soja 2026|Video_Depoimento_Produtor/i);
  });

  test('TC-COM-05: AI Chat Navigation Persistence (F2 + F8)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    // Trigger AI insights
    await page.click('#btn-generate-insights');
    await expect(page.locator('#ai-diagnosis-report')).toBeVisible({ timeout: 15000 });

    // Type message in chat
    const chatInput = page.locator('#ai-chat-input');
    await chatInput.fill('Qual canal performa melhor?');
    await page.click('#btn-send-ai-chat');
    
    const chatLog = page.locator('#ai-chat-log');
    await expect(chatLog).toContainText('Qual canal performa melhor?');

    // Switch to Overview tab
    await page.click('.nav-item[data-view="view-geral"]');
    await expect(page.locator('#view-geral')).toBeVisible();

    // Return to AI Insights tab
    await page.click('.nav-item[data-view="view-ai"]');

    // Diagnostic report and chat history preserved
    await expect(page.locator('#ai-diagnosis-report')).toBeVisible();
    await expect(chatLog).toContainText('Qual canal performa melhor?');
  });

  test('TC-COM-06: Spreadsheet Filtering Tailors AI Prompt (F6 + F8)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    // Select platform filter "Instagram Only"
    const platformFilter = page.locator('#filter-leads-platform');
    await platformFilter.selectOption({ value: 'instagram' });

    // Navigate to AI Insights, trigger diagnostic
    await page.click('.nav-item[data-view="view-ai"]');
    
    // Outgoing API call payload should restrict summary to Instagram data
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/ai/insights')),
      page.click('#btn-generate-insights')
    ]);

    const postData = JSON.parse(request.postData());
    expect(postData.restrictedToPlatform).toBe('instagram');

    // Returned AI output centers on Instagram insights
    const diagnosisReport = page.locator('#ai-diagnosis-report');
    await expect(diagnosisReport).toBeVisible({ timeout: 15000 });
    await expect(diagnosisReport).toContainText(/Instagram/i);
  });

  test('TC-COM-07: Spreadsheet Date Filter Syncs Pixel Discrepancy (F6 + F7)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    // Select custom date filter
    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="7"]');

    // Open Pixel tab, click fetch events
    await page.click('.nav-item[data-view="view-events"]');
    await page.click('#btn-load-pixel-events');

    // Discrepancy card compares spreadsheet row count against pixel leads count for that exact date period
    const discrepancyVal = page.locator('#discrepancy-margin-val');
    await expect(discrepancyVal).toBeVisible();
  });

  test('TC-COM-08: Sidebar Toggle Dynamic Dropzone Layout (F1 + F3)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    // Open Campaign comparison view
    const comparisonGrid = page.locator('#campaign-comparison-grid');
    await expect(comparisonGrid).toBeVisible();

    const initialBox = await page.locator('#slot-a').boundingBox();

    // Click Sidebar toggle button to collapse menu
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    
    await expect(sidebar).toHaveClass(/collapsed/);

    // Assert comparison slot columns expand horizontally
    const finalBox = await page.locator('#slot-a').boundingBox();
    expect(finalBox.width).toBeGreaterThan(initialBox.width);
  });

});
