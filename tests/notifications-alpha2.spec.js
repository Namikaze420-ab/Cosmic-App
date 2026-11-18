const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 notifications', () => {
  test('notification capability is explicit and demo never requests permission', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicNotifications))).toBe(true);

    await page.locator('#demoMode').click();
    await page.locator('#desktopNav [data-page="profile"]').click();

    const section = page.locator('#notificationSettingsAlpha2');
    await expect(section).toBeVisible();
    await expect(section).toContainText('Foreground reminders');
    await expect(section).toContainText('Closed-app push is not enabled yet');
    await expect(page.locator('#notificationPermission')).toBeDisabled();
  });
});
