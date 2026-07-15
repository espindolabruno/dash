const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('Tier 4: Real-World Workload Scenarios', () => {

  test('TC-WRK-01: Full Client Onboard & Audit (F1, F2, F6, F7)', async ({ page }) => {
    // 1. Log in via mock credentials
    await page.goto('/');
    await page.fill('#input-username', 'admin');
    await page.fill('#input-password', 'password123');
    await page.click('#btn-login-submit');
    await expect(page.locator('#dashboard-screen')).toBeVisible();

    // 2. Click Sidebar hamburger and navigate to settings modal
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (isCollapsed) {
      await toggleBtn.click();
    }
    await page.click('#btn-settings');
    const modal = page.locator('#modal-settings');
    await expect(modal).toBeVisible();

    // 3. Map a new client folder ("VM Equipamentos") to a Meta Ad Account ID, click Save
    const clientMapSelect = modal.locator('#select-client-folder');
    await clientMapSelect.selectOption({ label: 'VM Equipamentos' });
    const adAccountSelect = modal.locator('#select-ad-account');
    await adAccountSelect.selectOption({ label: 'VM Equipamentos (act_1034348999771083)' });
    await modal.locator('#btn-save-mapping').click();

    // Mapping is written to filesystem (mappings.json)
    // Wait for file change or check via mock API/filesystem
    const mappingsPath = path.join(__dirname, '../../data/mappings.json');
    await expect.poll(() => fs.existsSync(mappingsPath)).toBe(true);

    // 4. Navigate to Leads Spreadsheet tab. Verify leads are parsed and populated
    await page.click('.nav-item[data-view="view-leads"]');
    const table = page.locator('#leads-spreadsheet-table');
    await expect(table).toBeVisible();
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // 5. Navigate to Pixel tab, enter Pixel ID, fetch conversion data
    await page.click('.nav-item[data-view="view-events"]');
    await page.click('#btn-settings');
    await page.fill('#input-pixel-id', '1234567890');
    await page.click('#btn-save-settings');
    await page.click('#btn-load-pixel-events');

    // PageView and Lead counts fetch successfully
    await expect(page.locator('#pixel-pageview-count')).toHaveText(/\d+/);
    await expect(page.locator('#pixel-lead-count')).toHaveText(/\d+/);
  });

  test('TC-WRK-02: Campaign Comparison & Budget Audit (F2, F3, F4, F8)', async ({ page }) => {
    await loginDemo(page);

    // 1. Navigate to Campaign tab
    await page.click('.nav-item[data-view="view-campaign"]');

    // 2. Set date picker to "Últimos 30 dias" and enable PoP variance comparison
    await page.click('#date-picker-trigger');
    await page.click('.date-option[data-range="30"]');
    await page.locator('#chk-compare-pop').check();

    // 3. Drag the two highest CPL campaigns from the sidebar list into Slot A and Slot B
    const highCplCampaign1 = page.locator('.campaign-card[data-cpl-rank="1"]').first();
    const highCplCampaign2 = page.locator('.campaign-card[data-cpl-rank="2"]').first();
    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');

    await highCplCampaign1.dragTo(slotA);
    await highCplCampaign2.dragTo(slotB);

    // 4. Audit side-by-side CPA and Cost deltas
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).toBeVisible();
    await expect(comparisonTable.locator('.delta-badge')).toHaveCount(2);

    // 5. Switch to AI Insights tab and trigger Claude diagnostic to request budget reallocation options
    await page.click('.nav-item[data-view="view-ai"]');
    const focusSelect = page.locator('#select-ai-focus');
    await focusSelect.selectOption({ value: 'budget_allocation' });
    await page.click('#btn-generate-insights');

    // Claude returns budget reallocation report
    const diagnosisReport = page.locator('#ai-diagnosis-report');
    await expect(diagnosisReport).toBeVisible({ timeout: 15000 });
    await expect(diagnosisReport).toContainText(/Orçamento|Realocação/i);
  });

  test('TC-WRK-03: Creative Performance Video Funnel Audit (F2, F5, F6, F8)', async ({ page }) => {
    await loginDemo(page);

    // 1. Navigate to Leads Spreadsheet
    await page.click('.nav-item[data-view="view-leads"]');

    // 2. Click on video creative thumbnail to verify visual preview lightbox loads
    const videoThumbnail = page.locator('#leads-spreadsheet-table tbody tr[data-format="video"] img.ad-thumbnail').first();
    await videoThumbnail.click();
    const lightbox = page.locator('#modal-lightbox');
    await expect(lightbox).toBeVisible();

    // 3. Close lightbox, switch to Campaign tab, select the video creative to load its 5-step watch funnel
    await lightbox.locator('.btn-close-lightbox').click();
    await expect(lightbox).not.toBeVisible();

    await page.click('.nav-item[data-view="view-campaign"]');
    const videoCreative = page.locator('.creative-item[data-format="video"]').first();
    await videoCreative.click();

    // 4. Inspect drop-off rates at 50% and 75% steps
    const step50 = page.locator('#video-funnel-chart .funnel-step[data-step="50"]');
    const step75 = page.locator('#video-funnel-chart .funnel-step[data-step="75"]');
    await expect(step50).toBeVisible();
    await expect(step75).toBeVisible();

    // 5. Navigate to AI Insights, trigger diagnostic with focus on "Criativos" to get copy improvements
    await page.click('.nav-item[data-view="view-ai"]');
    const focusSelect = page.locator('#select-ai-focus');
    await focusSelect.selectOption({ value: 'creatives' });
    await page.click('#btn-generate-insights');

    // Claude returns specific hook suggestions
    const diagnosisReport = page.locator('#ai-diagnosis-report');
    await expect(diagnosisReport).toBeVisible({ timeout: 15000 });
    await expect(diagnosisReport).toContainText(/Hook|Criativos|Melhorias/i);
  });

  test('TC-WRK-04: Pixel Events Tracking Discrepancy Resolving (F2, F6, F7, F8)', async ({ page }) => {
    await loginDemo(page);

    // 1. Open Pixel Event tab, trigger Meta Pixel Leads fetch
    await page.click('.nav-item[data-view="view-events"]');
    await page.click('#btn-load-pixel-events');
    const pixelLeadCountText = await page.locator('#pixel-lead-count').textContent();

    // 2. Switch to Leads Spreadsheet, filter by status "Lead"
    await page.click('.nav-item[data-view="view-leads"]');
    const statusFilter = page.locator('#filter-leads-status');
    await statusFilter.selectOption({ value: 'lead' });
    const crmLeadsCountText = await page.locator('#leads-counter').textContent();

    // 3. Compare sheet count against pixel leads count, noting a 25% discrepancy
    // Verify discrepancy UI displays mismatch percentage
    await page.click('.nav-item[data-view="view-events"]');
    const discrepancyVal = page.locator('#discrepancy-margin-val');
    await expect(discrepancyVal).toHaveText('25%');

    // 4. Open AI Insights tab
    await page.click('.nav-item[data-view="view-ai"]');

    // 5. Ask Claude chat assistant: "Por que temos 25% mais leads no pixel do que na planilha de CRM no último mês?"
    const chatInput = page.locator('#ai-chat-input');
    await chatInput.fill('Por que temos 25% mais leads no pixel do que na planilha de CRM no último mês?');
    await page.click('#btn-send-ai-chat');

    // Claude provides troubleshooting checklist
    const botReply = page.locator('.chat-bubble.bot').last();
    await expect(botReply).toBeVisible({ timeout: 15000 });
    await expect(botReply).toContainText(/duplicados|pixel|CRM/i);
  });

  test('TC-WRK-05: Complete Workspace Navigation & Settings Recovery (F1, F2, F6)', async ({ page }) => {
    await loginDemo(page);

    // 1. Collapse sidebar to maximize layout
    const sidebar = page.locator('.sidebar');
    const toggleBtn = page.locator('#btn-sidebar-toggle');
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    if (!isCollapsed) {
      await toggleBtn.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);

    // 2. Click through all tabs in sequence
    const tabs = ['view-geral', 'view-campaign', 'view-leads', 'view-events', 'view-ai'];
    for (const tab of tabs) {
      await page.click(`.nav-item[data-view="${tab}"]`);
      await expect(page.locator(`#${tab}`)).toBeVisible();
    }

    // 3. Click Settings, disconnect Google Drive
    await page.click('#btn-settings');
    const modal = page.locator('#modal-settings');
    await expect(modal).toBeVisible();

    await modal.locator('#btn-disconnect-google-drive').click();
    
    // Assert client selection shows "Conexão pendente"
    const clientSelect = page.locator('#select-client');
    await expect(clientSelect).toContainText('Conexão pendente');

    // 4. Click Connect Google Drive in settings modal, authorize via mock OAuth, and map client folders
    await modal.locator('#btn-connect-google-drive').click();
    
    // Auth flow on mock page
    await page.click('#btn-mock-authorize');

    // Map folders
    const clientMapSelect = modal.locator('#select-client-folder');
    await clientMapSelect.selectOption({ label: 'AgroForte Sementes' });
    await modal.locator('#btn-save-mapping').click();

    // 5. Close modal, verify that client selector is updated and Leads Spreadsheet is populated
    await modal.locator('.btn-close-modal').click();
    await expect(modal).not.toBeVisible();

    await expect(clientSelect).toContainText('AgroForte Sementes');
    await page.click('.nav-item[data-view="view-leads"]');
    const rows = page.locator('#leads-spreadsheet-table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

});
