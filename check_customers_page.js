import { chromium } from 'playwright';
import { resolve } from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log("Navigating to production admin portal...");
  await page.goto('https://cozyaura-6969-production.up.railway.app/admin');

  console.log("Entering credentials...");
  await page.fill('input[type="password"]', 'CozyAura@6969');
  await page.click('button:has-text("Access Dashboard")');

  console.log("Waiting for dashboard tab to load...");
  await page.waitForTimeout(3000);

  console.log("Clicking Customers tab...");
  await page.click('#nav-customers');

  console.log("Waiting 5 seconds for sync fetch to complete and UI to update...");
  await page.waitForTimeout(5000);

  // Print customer rows info
  const rows = await page.$$eval('#customersTableBody tr', trs => {
    return trs.map(tr => {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
      return tds.join(' | ');
    });
  });

  console.log(`Number of rows in customers table: ${rows.length}`);
  console.log("=== CUSTOMER ROWS ===");
  rows.slice(0, 15).forEach((r, idx) => console.log(`${idx + 1}: ${r}`));
  if (rows.length > 15) {
    console.log(`... and ${rows.length - 15} more rows`);
  }

  // Also print sessionStorage / localStorage values
  const counts = await page.evaluate(() => {
    return {
      localStorage_users_length: JSON.parse(localStorage.getItem('lumiere_admin_users') || '[]').length,
      sessionStorage_total_users: sessionStorage.getItem('lumiere_admin_total_users'),
      localStorage_active_tab: localStorage.getItem('lumiere_admin_active_tab')
    };
  });
  console.log("=== STORAGE COUNTS ===");
  console.log(JSON.stringify(counts, null, 2));

  // Capture screenshot and save it
  const screenshotPath = 'C:/Users/ekbot/.gemini/antigravity/brain/32ea60f5-09dc-4c52-aeba-295b10d9d465/media__customers_tab.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
}

run().catch(console.error);
