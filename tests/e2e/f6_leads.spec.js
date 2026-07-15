const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F6: Leads Spreadsheet & Thumbnails', () => {

  test('TC-F6-01: Render CRM Leads Table', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const table = page.locator('#leads-spreadsheet-table');
    await expect(table).toBeVisible();

    const header = table.locator('thead tr');
    await expect(header).toContainText(/Nome/i);
    await expect(header).toContainText(/WhatsApp|Telefone/i);
    await expect(header).toContainText(/Plataforma/i);
    await expect(header).toContainText(/Dispositivo/i);
    await expect(header).toContainText(/Status/i);
    await expect(header).toContainText(/Data\/Hora|Data/i);
  });

  test('TC-F6-02: Text Search Filtering', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const searchInput = page.locator('#leads-table-search');
    await searchInput.fill('Silveira');
    
    // Assert row count decreases and matching elements contain "Silveira"
    const rows = page.locator('#leads-spreadsheet-table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/Silveira/i);
    }
  });

  test('TC-F6-03: Column Sorting', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const dateHeader = page.locator('#leads-spreadsheet-table th[data-column="date"]');
    
    // First click: Sort Descending
    await dateHeader.click();
    let firstRowDate = await page.locator('#leads-spreadsheet-table tbody tr').first().locator('td.col-date').textContent();

    // Second click: Sort Ascending
    await dateHeader.click();
    let firstRowDateAsc = await page.locator('#leads-spreadsheet-table tbody tr').first().locator('td.col-date').textContent();

    expect(firstRowDate).not.toEqual(firstRowDateAsc);
  });

  test('TC-F6-04: Leads Table Pagination', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const paginationNext = page.locator('#leads-pagination-next');
    await paginationNext.click();

    const pageLabel = page.locator('#leads-page-label');
    await expect(pageLabel).toContainText('Página 2');

    const tableRows = page.locator('#leads-spreadsheet-table tbody tr');
    await expect(tableRows).toHaveCount(10);
  });

  test('TC-F6-05: Thumbnail Preview Lightbox', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const firstThumbnail = page.locator('#leads-spreadsheet-table tbody tr img.ad-thumbnail').first();
    await firstThumbnail.click();

    const lightbox = page.locator('#modal-lightbox');
    await expect(lightbox).toBeVisible();
    
    const lightboxImage = lightbox.locator('img.lightbox-preview-img');
    await expect(lightboxImage).toBeVisible();
  });

  test('TC-F6-06: No Results Search Found', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const searchInput = page.locator('#leads-table-search');
    await searchInput.fill('NoMatchingQuery999');

    const placeholder = page.locator('#leads-empty-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Nenhum lead correspondente encontrado');
  });

  test('TC-F6-07: Broken Image Lightbox Fallback', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const brokenThumbnail = page.locator('#leads-spreadsheet-table tbody tr[data-mock="broken-image"] img.ad-thumbnail');
    await brokenThumbnail.hover();

    const fallbackIcon = page.locator('#leads-spreadsheet-table tbody tr[data-mock="broken-image"] .thumbnail-fallback');
    await expect(fallbackIcon).toBeVisible();
  });

  test('TC-F6-08: Special Characters/HTML Injection in Search', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const searchInput = page.locator('#leads-table-search');
    await searchInput.fill('<div>');

    // Confirm that table does not break or run script
    const placeholder = page.locator('#leads-empty-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('TC-F6-09: Empty Fields Rendering', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const emptyCellRow = page.locator('#leads-spreadsheet-table tbody tr[data-mock="empty-fields"]');
    const phoneCell = emptyCellRow.locator('td.col-phone');
    const statusCell = emptyCellRow.locator('td.col-status');

    // Should display cell with fallback character like '—'
    await expect(phoneCell).toHaveText('—');
    await expect(statusCell).toHaveText('—');
  });

  test('TC-F6-10: Pagination Extreme Boundary', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-leads"]');

    const paginationPrev = page.locator('#leads-pagination-prev');
    await expect(paginationPrev).toBeDisabled();

    // Navigate to last page
    const lastPageBtn = page.locator('#leads-pagination-last');
    if (await lastPageBtn.isVisible()) {
      await lastPageBtn.click();
      const paginationNext = page.locator('#leads-pagination-next');
      await expect(paginationNext).toBeDisabled();
    }
  });

});
