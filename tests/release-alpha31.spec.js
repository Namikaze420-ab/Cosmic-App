const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience31 && window.CosmicExperience31Safety))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.1 release experience', () => {
  test('personal guidance, journal and appearance controls render across browsers', async ({ page }) => {
    await enterDemo(page);

    await expect(page.locator('#page-home .hero-card')).toContainText('Personal Day');
    await expect(page.locator('#page-home .personal-focus-card')).toContainText('FOR YOU TODAY');

    await page.locator('[data-page="insights"]:visible').first().click();
    await expect(page.locator('.personal-insight-hero')).toBeVisible();
    await expect(page.locator('.personal-lens-grid')).toContainText('Relationships');
    await expect(page.locator('#personalGuidanceDisclaimer')).toBeVisible();

    await page.locator('[data-page="diary"]:visible').first().click();
    await expect(page.locator('.personal-journal-lead')).toBeVisible();
    await expect(page.locator('[data-journal-prompt]')).toHaveCount(3);

    await page.locator('[data-page="profile"]:visible').first().click();
    await expect(page.locator('#experienceAppearance')).toBeVisible();
    await page.locator('[data-appearance-choice="dark"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-palette-choice="solar"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'solar');
  });

  test('modern shell remains viewport-safe and all five primary destinations are reachable', async ({ page }) => {
    await enterDemo(page);

    for (const destination of ['home','calendar','diary','insights','profile']) {
      await page.locator(`[data-page="${destination}"]:visible`).first().click();
      await expect(page.locator(`#page-${destination}`)).toBeVisible();
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      expect(fits).toBe(true);
    }

    if (await page.locator('#mobileNav').isVisible()) {
      await expect(page.locator('#mobileNav')).toContainText('Today');
      await expect(page.locator('#mobileNav')).toContainText('Plan');
      await expect(page.locator('#mobileNav')).toContainText('Journal');
      await expect(page.locator('#mobileNav')).toContainText('Insights');
      await expect(page.locator('#mobileNav')).toContainText('You');
    } else {
      await expect(page.locator('#desktopNav')).toContainText('Today');
      await expect(page.locator('#desktopNav')).toContainText('Plan');
      await expect(page.locator('#desktopNav')).toContainText('Journal');
      await expect(page.locator('#desktopNav')).toContainText('Insights');
      await expect(page.locator('#desktopNav')).toContainText('You');
    }
  });
});
