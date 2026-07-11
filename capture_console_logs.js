import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[Browser Page Error] ${err.message}`);
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

  // Evaluate compiled customers in local storage
  const info = await page.evaluate(() => {
    return {
      users_cache: localStorage.getItem('lumiere_admin_users'),
      addresses_cache: localStorage.getItem('lumiere_admin_user_addresses'),
      orders_cache: localStorage.getItem('lumiere_admin_orders'),
      wishlist_cache: localStorage.getItem('lumiere_admin_wishlist')
    };
  });
  console.log("=== LOCAL STORAGE CACHES ===");
  console.log("users:", info.users_cache ? JSON.parse(info.users_cache).length : 'null');
  console.log("addresses:", info.addresses_cache ? JSON.parse(info.addresses_cache).length : 'null');
  console.log("orders:", info.orders_cache ? JSON.parse(info.orders_cache).length : 'null');
  console.log("wishlist:", info.wish_cache ? JSON.parse(info.wishlist_cache).length : 'null');

  await browser.close();
}

run().catch(console.error);
