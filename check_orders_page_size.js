import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log("Navigating to production admin portal...");
  await page.goto('https://cozyaura-6969-production.up.railway.app/admin');

  console.log("Entering credentials...");
  await page.fill('input[type="password"]', 'CozyAura@6969');
  await page.click('button:has-text("Access Dashboard")');

  console.log("Waiting for dashboard tab to load...");
  await page.waitForTimeout(3000);

  console.log("Clicking Orders tab...");
  await page.click('#nav-orders');

  console.log("Waiting 5 seconds for sync fetch to complete and UI to update...");
  await page.waitForTimeout(5000);

  // Print orders rows info
  const rowsCount = await page.$$eval('#ordersBody tr', trs => trs.length);
  const paginationLabel = await page.$eval('#ordersPaginationInfo', el => el.textContent.trim());

  console.log(`Number of rows in orders table: ${rowsCount}`);
  console.log(`Pagination label text: "${paginationLabel}"`);

  await browser.close();
}

run().catch(console.error);
