const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil:'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience33))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.3 release experience', () => {
  test('explicit guidance priorities work across Firefox and WebKit', async ({ page }) => {
    await enterDemo(page);
    await page.locator('[data-page="profile"]:visible').first().click();
    await expect(page.locator('#alpha33GuidanceSettings')).toBeVisible();
    await page.locator('[data-alpha33-focus="money"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas)).toEqual(['money']);
    await page.locator('[data-alpha33-style="reflective"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().guidance_style)).toBe('reflective');

    await page.locator('[data-page="insights"]:visible').first().click();
    await expect(page.locator('.personal-lens-grid .personal-lens').first()).toHaveClass(/money/);
    await expect(page.locator('#alpha33InsightTuning')).toContainText('Money');
  });

  test('personalization surfaces remain viewport safe', async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(async () => {
      await window.CosmicExperience33.setFocus('wellbeing');
      await window.CosmicExperience33.setFocus('growth');
      window.CosmicExperience32.markActivationStep('guidance');
      window.CosmicExperience32.markActivationStep('plan');
      window.CosmicExperience32.markActivationStep('journal');
    });
    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('#alpha33PriorityStrip')).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(fits).toBe(true);
  });
});
