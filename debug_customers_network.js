import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });

  // Intercept all network responses to /api/admin
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/admin')) {
      console.log(`\n[Network Response] URL: ${url}`);
      console.log(`Status: ${response.status()}`);
      try {
        const json = await response.json();
        console.log("Response JSON Data keys:", Object.keys(json.data || {}));
        if (json.data) {
          console.log(`- users length: ${json.data.users?.length}`);
          console.log(`- userAddresses length: ${json.data.userAddresses?.length}`);
          console.log(`- wishlist length: ${json.data.wishlist?.length}`);
          console.log(`- pagination:`, json.data.pagination);
          if (json.data.users) {
            console.log(`- Sample users:`, json.data.users.slice(0, 5));
          }
        }
      } catch (e) {
        console.log("Could not parse response JSON:", e.message);
      }
    }
  });

  console.log("Navigating to production admin portal...");
  await page.goto('https://cozyaura-6969-production.up.railway.app/admin');

  console.log("Entering credentials...");
  await page.fill('input[type="password"]', 'CozyAura@6969');
  await page.click('button:has-text("Access Dashboard")');

  console.log("Waiting for initial load...");
  await page.waitForTimeout(3000);

  console.log("Clicking Customers tab...");
  await page.click('#nav-customers');

  console.log("Waiting for tab load to complete...");
  await page.waitForTimeout(5000);

  await browser.close();
}

run().catch(console.error);
