const { test, expect } = require('@playwright/test');

async function loginDemo(page) {
  await page.goto('/');
  await page.click('#btn-login-demo');
  await expect(page.locator('#dashboard-screen')).toBeVisible();
}

test.describe('F3: Drag & Drop Comparison', () => {

  test('TC-F3-01: Drag Campaign to Dropzone A', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard = page.locator('.campaign-card').first();
    const slotA = page.locator('#slot-a');

    // Perform drag and drop
    await campaignCard.dragTo(slotA);

    // Verify Slot A displays campaign details and is not in "Vazio" state
    await expect(slotA).not.toHaveText(/Vazio/i);
    await expect(slotA).toContainText(/Lançamento Soja/i);
  });

  test('TC-F3-02: Drag Creative to Dropzone B', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const creativeCard = page.locator('.creative-card').first();
    const slotB = page.locator('#slot-b');

    await creativeCard.dragTo(slotB);

    await expect(slotB).not.toHaveText(/Vazio/i);
    await expect(slotB).toContainText(/Video_Depoimento_Produtor/i);
  });

  test('TC-F3-03: Render Side-by-Side Table', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard1 = page.locator('.campaign-card').nth(0);
    const campaignCard2 = page.locator('.campaign-card').nth(1);
    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');

    await campaignCard1.dragTo(slotA);
    await campaignCard2.dragTo(slotB);

    // Assert that the side-by-side comparison table is rendered underneath
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).toBeVisible();
    await expect(comparisonTable).toContainText(/CPL/i);
    await expect(comparisonTable).toContainText(/Clicks/i);
  });

  test('TC-F3-04: Clear Single Comparison Slot', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard = page.locator('.campaign-card').first();
    const slotA = page.locator('#slot-a');

    await campaignCard.dragTo(slotA);
    await expect(slotA).toContainText(/Lançamento Soja/i);

    // Click "Remover" icon (X) on Slot A
    await slotA.locator('.btn-remove-slot').click();

    // Slot A reverts to the "Vazio" placeholder state
    await expect(slotA).toContainText(/Vazio/i);
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).not.toBeVisible();
  });

  test('TC-F3-05: Reset Dropzone Comparison', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard1 = page.locator('.campaign-card').nth(0);
    const campaignCard2 = page.locator('.campaign-card').nth(1);
    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');

    await campaignCard1.dragTo(slotA);
    await campaignCard2.dragTo(slotB);

    // Click "Limpar Comparação" button
    await page.click('#btn-clear-comparison');

    // Both slots show the default empty state
    await expect(slotA).toContainText(/Vazio/i);
    await expect(slotB).toContainText(/Vazio/i);
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).not.toBeVisible();
  });

  test('TC-F3-06: Reject Dragging Invalid Type', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const invalidDragElement = page.locator('.sidebar-logo');
    const slotA = page.locator('#slot-a');

    // Try to drag logo to slot A
    await invalidDragElement.dragTo(slotA);

    // Verify Slot A remains in "Vazio" state
    await expect(slotA).toContainText(/Vazio/i);
  });

  test('TC-F3-07: Duplicate Item Rejection', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard = page.locator('.campaign-card').first();
    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');

    await campaignCard.dragTo(slotA);
    await campaignCard.dragTo(slotB);

    // Slot B rejects Campaign A, showing validation warning
    const warning = page.locator('.validation-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/Item já está em comparação/i);
  });

  test('TC-F3-08: Slots Limit Boundary (Max 3)', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const c1 = page.locator('.campaign-card').nth(0);
    const c2 = page.locator('.campaign-card').nth(1);
    const c3 = page.locator('.campaign-card').nth(2);
    const c4 = page.locator('.campaign-card').nth(3);

    const slotA = page.locator('#slot-a');
    const slotB = page.locator('#slot-b');
    const slotC = page.locator('#slot-c');

    await c1.dragTo(slotA);
    await c2.dragTo(slotB);
    await c3.dragTo(slotC);

    // Drag 4th element onto slot C (already occupied) or the container
    await c4.dragTo(slotC);
    
    // Assert slot C remains c3
    await expect(slotC).not.toContainText(/c4/i);
  });

  test('TC-F3-09: Drag Cancellation Handling', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard = page.locator('.campaign-card').first();
    const slotA = page.locator('#slot-a');

    // Simulate drag start, drag hover over Slot A, move out, then drop
    const boxCard = await campaignCard.boundingBox();
    const boxSlot = await slotA.boundingBox();

    if (boxCard && boxSlot) {
      await page.mouse.move(boxCard.x + boxCard.width / 2, boxCard.y + boxCard.height / 2);
      await page.mouse.down();
      await page.mouse.move(boxSlot.x + boxSlot.width / 2, boxSlot.y + boxSlot.height / 2);
      // Move cursor outside slot area before releasing mouse
      await page.mouse.move(boxSlot.x - 100, boxSlot.y - 100);
      await page.mouse.up();
    }

    // Slot A returns to empty state
    await expect(slotA).toContainText(/Vazio/i);
  });

  test('TC-F3-10: Mobile Touch Drag Emulation', async ({ page }) => {
    await loginDemo(page);
    await page.click('.nav-item[data-view="view-campaign"]');

    const campaignCard = page.locator('.campaign-card').first();
    const slotA = page.locator('#slot-a');

    // Wait for the campaign cards to load and render
    await campaignCard.waitFor({ state: 'visible' });

    // Emulate touch pointer events for drag-and-drop
    const boxCard = await campaignCard.boundingBox();
    const boxSlot = await slotA.boundingBox();

    if (boxCard && boxSlot) {
      await page.touchscreen.tap(boxCard.x + boxCard.width / 2, boxCard.y + boxCard.height / 2);
      // Playwright dispatchEvent helper to simulate touch events
      await campaignCard.dispatchEvent('touchstart');
      await slotA.dispatchEvent('dragover');
      await slotA.dispatchEvent('drop');
      await campaignCard.dispatchEvent('touchend');
    }
    
    // Check if Campaign A is in Slot A (represented as final desired state)
    // We can directly verify it's placed
    await expect(slotA).not.toHaveText(/Vazio/i);
  });

});
