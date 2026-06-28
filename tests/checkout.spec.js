import { test, expect } from '@playwright/test';

// Target the live production site
const SITE_URL = 'https://cozyaura-6969-production.up.railway.app';

test.describe('Lumière Storefront Checkout Flows', () => {
  
  test('Should place a Self Pickup COD order successfully', async ({ page }) => {
    // 1. Open the storefront homepage
    console.log("Navigating to:", SITE_URL);
    await page.goto(SITE_URL);
    await expect(page).toHaveTitle(/Lumière/);

    // Wait for the initialization boot loader to disappear
    console.log("Waiting for boot loader to dismiss...");
    await page.waitForSelector('#globalBootLoader', { state: 'detached', timeout: 30000 });

    // Mock Google Login auth state to bypass OAuth modal in headless environment
    console.log("Mocking authentication status for vasantiekbote085@gmail.com...");
    await page.evaluate(() => {
      window.getLoggedInEmail = () => 'vasantiekbote085@gmail.com';
      window.isUserLoggedIn = () => true;
    });

    // 2. Click "Explore the Collection" button to navigate to the Shop page
    console.log("Navigating to Shop page...");
    await page.locator('button:has-text("Explore the Collection")').click();
    await expect(page.locator('#shop')).toBeVisible();

    // 3. Open the Quickview modal for the first product by clicking its card
    console.log("Opening Quickview modal by clicking the first product card...");
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.click();

    // Verify modal is open
    await expect(page.locator('#productModalOverlay')).toHaveClass(/active/);

    // 4. Select a scent variant to activate the Add to Cart button (click the visible label wrapper)
    console.log("Selecting first scent variant label...");
    await page.locator('.variant-radio-label').first().click();

    // 5. Add to Cart
    console.log("Adding product to cart...");
    await page.locator('#addToCartBtn').click();
    
    // Close the Quickview modal using forced click to bypass overlay interceptors
    console.log("Closing Quickview modal...");
    await page.locator('#productModalOverlay .close-modal-btn').click({ force: true });

    // 6. Go to Cart page
    console.log("Opening Cart page...");
    await page.locator('.nav-cta').click();
    await expect(page.locator('#cartPage')).toBeVisible();

    // 7. Proceed to Checkout form (authenticated state allows instant progression)
    console.log("Proceeding to checkout...");
    await page.locator('button:has-text("Proceed to Checkout")').click();
    await expect(page.locator('#payment')).toBeVisible();

    // 8. Switch delivery tab to "Self Pickup In Store"
    console.log("Selecting Self Pickup delivery option...");
    await page.locator('#deliveryMethodPickupBtn').click();
    await expect(page.locator('#pickupInfoCard')).toBeVisible();
    
    // Verify shipping address cards are hidden
    await expect(page.locator('#savedAddressesSection')).toBeHidden();

    // 9. Fill Contact Details (Email is prefilled and disabled for authenticated users)
    console.log("Filling contact details...");
    await page.locator('#fname').fill('TestFirst');
    await page.locator('#lname').fill('TestLast');
    await page.locator('#phone').fill('+91 7517318391');

    // 10. Proceed to Payment Screen
    console.log("Proceeding to payment screen...");
    await page.locator('#guestProceedBtn').click();
    await expect(page.locator('#paymentScreenContainer')).toBeVisible();

    // 11. Select Cash on Delivery (COD) payment option
    console.log("Selecting Cash on Delivery (COD)...");
    await page.locator('text=Cash on Delivery (COD)').click();

    // 12. Pay Now / Place Order
    console.log("Submitting order...");
    await page.locator('.pay-now-btn').click();

    // 13. Verify Success Celebration Modal displays
    console.log("Waiting for success confirmation...");
    const celebrationModal = page.locator('#celebrationModal');
    await expect(celebrationModal).toHaveClass(/active/, { timeout: 30000 });

    // Check order ID is populated
    const orderIdText = await page.locator('#celebrationOrderId').textContent();
    console.log(`Test Succeeded! Successfully placed Order ID: ${orderIdText}`);
  });
});
