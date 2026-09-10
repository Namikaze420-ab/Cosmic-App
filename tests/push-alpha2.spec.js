const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 background push foundation', () => {
  test('push receiver exists but subscription activation remains configuration locked', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPush))).toBe(true);

    const capability = await page.evaluate(() => ({
      supported: window.CosmicPush.supported(),
      configured: window.CosmicPush.configured(),
    }));
    expect(capability.configured).toBe(false);

    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();
    const source = await sw.text();
    expect(source).toContain("self.addEventListener('push'");
    expect(source).toContain("self.addEventListener('notificationclick'");

    await page.locator('#demoMode').click();
    await page.locator('[data-page="profile"]:visible').first().click();
    await expect(page.locator('#backgroundPushAlpha2')).toBeVisible();
    await expect(page.locator('#backgroundPushAlpha2')).toContainText('Sign in required');
    await expect(page.locator('#enableBackgroundPush')).toHaveCount(0);
  });
});
