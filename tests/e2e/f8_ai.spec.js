const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F8: Claude & MCP AI Insights', () => {

  test('TC-F8-01: Trigger IA Diagnostics', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'AgroForte Sementes' });

    // Click "Gerar Insights com IA"
    await page.click('#btn-generate-insights');

    // Assert spinner and progressive checklist messages
    await expect(page.locator('#ai-loading-spinner')).toBeVisible();
    await expect(page.locator('#ai-progress-text')).toBeVisible();
  });

  test('TC-F8-02: Progressive Loading Tracker', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    await page.click('#btn-generate-insights');

    const progressText = page.locator('#ai-progress-text');
    await expect(progressText).toContainText('Conectando MCP...');
    await expect(progressText).toContainText('Consultando Meta Ads...', { timeout: 10000 });
    await expect(progressText).toContainText('Claude Analisando...', { timeout: 10000 });
  });

  test('TC-F8-03: Render Urgency Panels', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    await page.click('#btn-generate-insights');

    // Wait for Claude response
    const criticalCard = page.locator('.urgency-card.critical');
    const warningCard = page.locator('.urgency-card.warning');
    const opportunityCard = page.locator('.urgency-card.opportunity');

    await expect(criticalCard).toBeVisible({ timeout: 15000 });
    await expect(criticalCard).toHaveCSS('border-left-color', 'rgb(239, 68, 68)'); // red
    await expect(warningCard).toHaveCSS('border-left-color', 'rgb(245, 158, 11)'); // yellow
    await expect(opportunityCard).toHaveCSS('border-left-color', 'rgb(16, 185, 129)'); // green
  });

  test('TC-F8-04: Interactive AI Chat Box', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    const chatInput = page.locator('#ai-chat-input');
    await chatInput.fill('Como posso otimizar a campanha Milho?');
    await page.click('#btn-send-ai-chat');

    // Question appended to chat log
    const chatLog = page.locator('#ai-chat-log');
    await expect(chatLog).toContainText('Como posso otimizar a campanha Milho?');

    // Loading bubble appears
    await expect(page.locator('#chat-loading-bubble')).toBeVisible();

    // Claude replies with advice
    const botReply = page.locator('.chat-bubble.bot').last();
    await expect(botReply).toBeVisible({ timeout: 10000 });
    await expect(botReply).toContainText(/[a-zA-Z]+/);
  });

  test('TC-F8-05: Focus Area Selection', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    // Select Focus: Custo/CPL
    const focusSelect = page.locator('#select-ai-focus');
    await focusSelect.selectOption({ value: 'cpl' });

    // Click "Gerar Insights" and capture payload
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/ai/insights')),
      page.click('#btn-generate-insights')
    ]);

    const postData = JSON.parse(request.postData());
    expect(postData.focus).toBe('cpl');

    // Diagnostic returned focuses on CPL
    const diagnosisReport = page.locator('#ai-diagnosis-report');
    await expect(diagnosisReport).toBeVisible({ timeout: 10000 });
    await expect(diagnosisReport).toContainText(/CPL/i);
  });

  test('TC-F8-06: Unmapped Client AI Trigger Block', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'Tratores Connect' }); // Unmapped client

    const generateBtn = page.locator('#btn-generate-insights');
    await expect(generateBtn).toBeDisabled();

    const banner = page.locator('#ai-mapping-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Mapeie a conta de anúncio correspondente nas configurações');
  });

  test('TC-F8-07: Claude API Overload (429 Rate Limit)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'AgroForte Sementes' });

    // Mock backend request to fail with 429
    await page.route('**/api/ai/insights', route => route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    }));

    await page.click('#btn-generate-insights');

    const errorBanner = page.locator('#ai-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Serviço ocupado no momento. Tente novamente em alguns minutos');
  });

  test('TC-F8-08: Claude Response Formatting Crash', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    // Mock unstructured text response
    await page.route('**/api/ai/insights', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ insights: 'Crucial insight without typical Markdown formatting markers.' })
    }));

    await page.click('#btn-generate-insights');

    // UI renders in fallback container without crashing layout
    const fallbackContainer = page.locator('#ai-insights-fallback-container');
    await expect(fallbackContainer).toBeVisible();
    await expect(fallbackContainer).toContainText('Crucial insight');
  });

  test('TC-F8-09: AI Panel Empty Spreadsheet Diagnostic', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    const clientSelect = page.locator('#select-client');
    await clientSelect.selectOption({ label: 'NutriCampo Fertilizantes' }); // client with empty spreadsheet

    await page.click('#btn-generate-insights');

    const diagnosticPanel = page.locator('#ai-diagnosis-report');
    await expect(diagnosticPanel).toBeVisible({ timeout: 10000 });
    await expect(diagnosticPanel).toContainText('Dados insuficientes no Google Sheets para diagnóstico de IA');
  });

  test('TC-F8-10: MCP Server Process Crashing', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-ai"]');

    // Mock MCP server crash payload
    await page.route('**/api/ai/insights', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Erro na integração com o servidor Meta MCP' })
    }));

    await page.click('#btn-generate-insights');

    const errorBanner = page.locator('#ai-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Erro na integração com o servidor Meta MCP');
  });

});
