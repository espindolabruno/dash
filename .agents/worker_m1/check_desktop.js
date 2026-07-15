const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.setViewportSize({ width: 1440, height: 900 });
  
  console.log('Navigating to / ...');
  await page.goto('http://localhost:3000/');
  
  console.log('Current URL:', page.url());
  
  console.log('Clicking #btn-login-demo ...');
  try {
    await page.click('#btn-login-demo');
    console.log('Clicked! Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Final URL:', page.url());
    const isVisible = await page.locator('#dashboard-screen').isVisible();
    console.log('Dashboard visible:', isVisible);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
