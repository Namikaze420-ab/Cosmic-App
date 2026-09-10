const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 privacy controls', () => {
  test('demo exposes privacy design without account mutation controls', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPrivacy))).toBe(true);

    await page.locator('#demoMode').click();
    await expect(page.locator('#authGate')).toBeHidden();
    await page.locator('[data-page="profile"]:visible').first().click();

    await expect(page.locator('#privacyDataSection')).toBeVisible();
    await expect(page.locator('#privacyDataSection')).toContainText('Sign in required');
    await expect(page.locator('#exportAccountBtn')).toHaveCount(0);
    await expect(page.locator('#deleteAccountBtn')).toHaveCount(0);
  });
});
