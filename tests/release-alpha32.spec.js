const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience32))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.2 release experience', () => {
  test('activation guide and Daily Rhythm render across Firefox/WebKit without blocking core navigation', async ({ page }) => {
    await enterDemo(page);

    await expect(page.locator('#alpha32Activation')).toBeVisible();
    await expect(page.locator('#dailyRhythmCard')).toBeVisible();
    await expect(page.locator('#dailyRhythmCard')).toHaveAttribute('data-rhythm-phase', /morning|midday|evening|late/);

    await page.locator('[data-alpha32-activation="guidance"]').click();
    await expect(page.locator('#page-insights')).toBeVisible();
    await page.locator('[data-page="home"]:visible').first().click();

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits).toBe(true);
  });

  test('Daily Rhythm CTA remains functional on the release matrix', async ({ page }) => {
    await enterDemo(page);
    const action = page.locator('#dailyRhythmCard [data-alpha32-rhythm]').first();
    const type = await action.getAttribute('data-alpha32-rhythm');
    await action.click();

    if (type === 'plan') await expect(page.locator('#modalBackdrop')).toBeVisible();
    if (type === 'today' || type === 'tomorrow') await expect(page.locator('#page-calendar')).toBeVisible();
    if (type === 'journal') await expect(page.locator('#page-diary')).toBeVisible();
  });
});
