import { test, expect } from '@playwright/test';

const SITE_URL = 'https://cozyaura.netlify.app';

test.describe('Cozy Aura Storefront Checkout with Greeting Card', () => {
  
  test('Should place a Gift order with custom card successfully', async ({ page }) => {
    // Capture page console logs
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR] ${err.message}`);
    });

    // Capture network requests
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        console.log(`[API REQUEST] ${req.method()} ${req.url()}`);
        console.log(`  Payload: ${req.postData()}`);
      }
    });

    // Capture network responses
    page.on('response', async res => {
      if (res.url().includes('/api/')) {
        console.log(`[API RESPONSE] ${res.status()} ${res.url()}`);
        try {
          const body = await res.text();
          console.log(`  Body: ${body}`);
        } catch (e) {}
      }
    });

    console.log("Mocking authentication status for vasantiekbote085@gmail.com...");
    const adminSecret = process.env.ADMIN_SECRET || 'CozyAura@6969';
    await page.addInitScript((secret) => {
      window.getLoggedInEmail = () => 'vasantiekbote085@gmail.com';
      window.isUserLoggedIn = () => true;
      localStorage.setItem('test_bypass_secret', secret);
      const sessionObj = { 
        access_token: 'mock_test_jwt_token', 
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        user: { 
          id: 'mock-test-user-id', 
          email: 'vasantiekbote085@gmail.com',
          user_metadata: {
            full_name: 'Playwright Tester'
          }
        },
        expires_at: 9999999999
      };
      localStorage.setItem('sb-test-auth-token', JSON.stringify(sessionObj));
      localStorage.setItem('sb-fxihqzepiayehvszyita-auth-token', JSON.stringify(sessionObj));
    }, adminSecret);

    console.log("Navigating to:", SITE_URL);
    await page.goto(SITE_URL);
    await expect(page).toHaveTitle(/Cozy Aura/);

    console.log("Waiting for boot loader to dismiss...");
    await page.waitForSelector('#globalBootLoader', { state: 'detached', timeout: 30000 });

    console.log("Mocking authentication status for vasantiekbote085@gmail.com...");
    await page.evaluate(() => {
      window.getLoggedInEmail = () => 'vasantiekbote085@gmail.com';
      window.isUserLoggedIn = () => true;
    });

    console.log("Navigating to Shop page...");
    await page.locator('button:has-text("Explore the Collection")').click();
    await expect(page.locator('#shop')).toBeVisible();

    console.log("Locating product cards...");
    const productCards = page.locator('.product-card');
    const productCount = await productCards.count();
    let foundProductWithStock = false;
    
    for (let p = 0; p < productCount; p++) {
      console.log(`Opening Quickview modal for product card index: ${p}`);
      await productCards.nth(p).click();
      
      // Verify modal is open
      await expect(page.locator('#productModalOverlay')).toHaveClass(/active/);
      
      // Select an in-stock scent variant
      console.log("Checking variants...");
      const variantLabels = page.locator('.variant-radio-label');
      const variantCount = await variantLabels.count();
      let foundInStock = false;
      for (let i = 0; i < variantCount; i++) {
        await variantLabels.nth(i).click();
        const btnText = await page.locator('#addToCartBtn').textContent();
        if (btnText && btnText.toLowerCase().includes('add to cart')) {
          foundInStock = true;
          console.log(`Selected in-stock variant at index: ${i}`);
          break;
        }
      }
      
      if (foundInStock) {
        foundProductWithStock = true;
        break; // Keep the modal open and proceed with this product
      } else {
        console.log(`Product at index ${p} has no in-stock variants. Closing modal to try next product...`);
        await page.locator('#productModalOverlay .close-modal-btn').click({ force: true });
        await page.waitForTimeout(500);
      }
    }
    
    if (!foundProductWithStock) {
      throw new Error("No products with in-stock variants found in the entire catalog!");
    }

    // Add to Cart
    console.log("Adding product to cart...");
    await page.locator('#addToCartBtn').click();
    
    // Close the Quickview modal using forced click to bypass overlay interceptors
    console.log("Closing Quickview modal...");
    await page.locator('#productModalOverlay .close-modal-btn').click({ force: true });
    await page.waitForTimeout(500);

    console.log("Opening Cart page...");
    await page.locator('.nav-cta').click({ force: true });
    await expect(page.locator('#cartPage')).toBeVisible();

    // Trigger Gift Customizer Modal
    console.log("Toggling Gift option on Cart Page...");
    await page.locator('#toggleGift').click();
    
    console.log("Verifying Gift Card customizer modal is open...");
    const giftCardModal = page.locator('#giftCard');
    await expect(giftCardModal).toHaveClass(/active/);

    // Enter custom text on the card
    console.log("Typing greeting card message...");
    // Switch to Text Message tab
    await page.locator('#tabBtnText').click();
    await page.locator('#cardTextInput').fill('Automated Playwright Gift Card Message!');
    // Trigger update/rendering
    await page.locator('button:has-text("Add / Update Text Box")').click();
    await page.waitForTimeout(500);

    console.log("Saving and attaching the greeting card...");
    await page.locator('button:has-text("Save & Attach Card")').click();
    await expect(giftCardModal).not.toHaveClass(/active/);

    const debugSession = await page.evaluate(() => {
      return {
        cartType: sessionStorage.getItem('lumiere_cart_type'),
        layout: sessionStorage.getItem('lumiere_gift_card_layout')
      };
    });
    console.log("DEBUG Session Storage after saving card:", JSON.stringify(debugSession, null, 2));

    console.log("Proceeding to checkout...");
    await page.locator('button:has-text("Proceed to Checkout")').click();
    await expect(page.locator('#payment')).toBeVisible();

    console.log("Selecting Self Pickup delivery option...");
    await page.locator('#deliveryMethodPickupBtn').click();
    await expect(page.locator('#pickupInfoCard')).toBeVisible();

    console.log("Filling contact details...");
    await page.locator('#fname').fill('Playwright');
    await page.locator('#lname').fill('Tester');
    const emailField = page.locator('#email');
    if (!(await emailField.isDisabled())) {
      await emailField.fill('vasantiekbote085@gmail.com');
    }
    await page.locator('#phone').fill('+91 7517318391');

    console.log("Proceeding to payment screen...");
    await page.locator('#guestProceedBtn').click();
    await expect(page.locator('#paymentScreenContainer')).toBeVisible();

    console.log("Selecting Cash on Delivery (COD)...");
    await page.locator('span.payment-method-title:has-text("Cash on Delivery (COD)")').click();

    console.log("Submitting order...");
    await page.locator('.pay-now-btn').click();

    console.log("Waiting for success confirmation...");
    const celebrationModal = page.locator('#celebrationModal');
    await expect(celebrationModal).toHaveClass(/active/, { timeout: 30000 });

    const orderIdText = await page.locator('#celebrationOrderId').textContent();
    console.log(`Test Succeeded! Placed Order ID: ${orderIdText}`);
  });
});
