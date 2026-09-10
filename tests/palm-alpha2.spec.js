const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 palm foundation', () => {
  test('demo never stores or processes a palm image', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPalm))).toBe(true);

    const capability = await page.evaluate(() => ({
      acceptedTypes: window.CosmicPalm.acceptedTypes,
      maxBytes: window.CosmicPalm.maxBytes,
    }));
    expect(capability.acceptedTypes).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect(capability.maxBytes).toBe(10 * 1024 * 1024);

    await page.locator('#demoMode').click();
    await expect(page.locator('#authGate')).toBeHidden();
    await page.locator('[data-page="insights"]:visible').first().click();

    await expect(page.locator('#palmAlpha2Section')).toBeVisible();
    await expect(page.locator('#palmAlpha2Section')).toContainText('No palm image is stored in demo mode');
    await expect(page.locator('#palmFileInput')).toHaveCount(0);
    await expect(page.locator('#uploadPalmBtn')).toHaveCount(0);
  });
});
