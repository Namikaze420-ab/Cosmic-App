const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil:'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience33))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function openProfile(page) {
  await page.locator('[data-page="profile"]:visible').first().click();
  await expect(page.locator('#alpha33GuidanceSettings')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.3 explicit guidance personalization', () => {
  test('users can choose up to three explicit priorities and a guidance style locally in demo', async ({ page }) => {
    await enterDemo(page);
    await openProfile(page);

    await page.locator('[data-alpha33-focus="work"]').click();
    await page.locator('[data-alpha33-focus="money"]').click();
    await page.locator('[data-alpha33-focus="wellbeing"]').click();

    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas)).toEqual(['work','money','wellbeing']);
    await expect(page.locator('#alpha33GuidanceSettings')).toContainText('3/3 selected');

    await page.locator('[data-alpha33-focus="relationships"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas)).toEqual(['work','money','wellbeing']);

    await page.locator('[data-alpha33-style="practical"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().guidance_style)).toBe('practical');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cosmic.guidance.preferences.alpha33')));
    expect(stored).toEqual({ focus_areas:['work','money','wellbeing'], guidance_style:'practical' });
  });

  test('Today and Insights visibly prioritize only what the user selected', async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(async () => {
      await window.CosmicExperience33.setFocus('money');
      await window.CosmicExperience33.setFocus('wellbeing');
      await window.CosmicExperience33.setGuidanceStyle('practical');
      window.CosmicExperience32.markActivationStep('guidance');
      window.CosmicExperience32.markActivationStep('plan');
      window.CosmicExperience32.markActivationStep('journal');
    });

    await page.locator('[data-page="home"]:visible').first().click();
    const strip = page.locator('#alpha33PriorityStrip');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('Money');
    await expect(strip).toContainText('Wellbeing');
    await expect(strip).toContainText('one concrete money action');

    await page.locator('[data-page="insights"]:visible').first().click();
    const lenses = page.locator('.personal-lens-grid .personal-lens');
    await expect(lenses.first()).toHaveClass(/money/);
    await expect(lenses.nth(1)).toHaveClass(/wellbeing/);
    await expect(lenses.first()).toHaveClass(/alpha33-priority-lens/);
    await expect(page.locator('#alpha33InsightTuning')).toContainText('YOUR GUIDANCE SETTINGS');
  });

  test('no priorities means neutral guidance and no private-writing inference claim', async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(() => {
      localStorage.removeItem('cosmic.guidance.preferences.alpha33');
      window.CosmicExperience32.markActivationStep('guidance');
      window.CosmicExperience32.markActivationStep('plan');
      window.CosmicExperience32.markActivationStep('journal');
    });
    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('#alpha33PriorityStrip')).toContainText('without reading your Journal');

    await openProfile(page);
    await expect(page.locator('#alpha33GuidanceSettings')).toContainText('does not inspect Journal text');
    await expect(page.locator('[data-alpha33-focus][aria-pressed="true"]')).toHaveCount(0);
  });
});
