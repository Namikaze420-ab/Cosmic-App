const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 Google Calendar', () => {
  test('demo exposes read-only calendar design without requesting Google access', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicCalendar))).toBe(true);

    await page.locator('#demoMode').click();
    await page.locator('#desktopNav [data-page="profile"]').click();

    const section = page.locator('#googleCalendarAlpha2');
    await expect(section).toBeVisible();
    await expect(section).toContainText('Google Calendar · Alpha 2');
    await expect(section).toContainText('Read-only calendar import');
    await expect(section).toContainText('Demo mode never requests access');
    await expect(page.locator('#googleCalendarConnect')).toHaveCount(0);
    await expect(page.locator('#googleCalendarSync')).toHaveCount(0);
  });
});
