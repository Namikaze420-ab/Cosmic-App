const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience31 && window.CosmicExperience31Safety))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('#page-home')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.1 personalized experience', () => {
  test('daily home and Insights prioritize personal, actionable meaning', async ({ page }) => {
    await enterDemo(page);

    const hero = page.locator('#page-home .hero-card');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('Preview');
    await expect(hero).toContainText('Personal Day');
    await expect(hero).toContainText('Best window');
    await expect(page.locator('#page-home .personal-focus-card')).toContainText('FOR YOU TODAY');
    await expect(page.locator('#page-home .personal-reflection-card')).toContainText('EVENING CHECK-IN');

    await page.locator('[data-page="insights"]:visible').first().click();
    await expect(page.locator('#page-insights .personal-insight-hero')).toBeVisible();
    const lenses = page.locator('#page-insights .personal-lens-grid');
    await expect(lenses).toContainText('Work');
    await expect(lenses).toContainText('Relationships');
    await expect(lenses).toContainText('Money');
    await expect(lenses).toContainText('Wellbeing');
    await expect(lenses).toContainText('Watch for');
    await expect(lenses).toContainText('Reflection');
    await expect(page.locator('#personalGuidanceDisclaimer')).toContainText('not financial, medical or other professional advice');

    const text = await page.locator('#page-insights').innerText();
    expect(text).not.toContain('Daily score =');
    expect(text).not.toContain('No random number generation');
    expect(text).not.toContain('Astronomy Engine');
  });

  test('guided Journal prompts insert reflection text and use normal autosave', async ({ page }) => {
    await enterDemo(page);
    await page.locator('[data-page="diary"]:visible').first().click();

    await expect(page.locator('.personal-journal-lead')).toBeVisible();
    await expect(page.locator('[data-journal-prompt]')).toHaveCount(3);
    await page.locator('[data-journal-prompt="0"]').click();

    await expect.poll(async () => page.locator('#diaryEditor').inputValue()).not.toBe('');
    await expect(page.locator('#diarySave')).toHaveText('Saved locally', { timeout: 5000 });
  });

  test('appearance and accent controls persist locally without touching account data', async ({ page }) => {
    await enterDemo(page);
    await page.locator('[data-page="profile"]:visible').first().click();

    const appearance = page.locator('#experienceAppearance');
    await expect(appearance).toBeVisible();
    await expect(appearance).toContainText('Make Cosmic feel like yours');

    await page.locator('[data-appearance-choice="dark"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('[data-palette-choice="tide"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'tide');

    const storage = await page.evaluate(() => ({
      appearance: localStorage.getItem('cosmic.appearance'),
      palette: localStorage.getItem('cosmic.palette')
    }));
    expect(storage).toEqual({ appearance:'dark', palette:'tide' });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'tide');
  });

  test('quick actions work after entry and remain unavailable behind the auth lock', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience31Safety))).toBe(true);

    await page.keyboard.press('Control+K');
    await expect(page.locator('#commandPalette')).toBeHidden();

    await page.locator('#demoMode').click();
    await expect(page.locator('.app-shell')).toBeVisible();
    await page.keyboard.press('Control+K');
    await expect(page.locator('#commandPalette')).toBeVisible();
    await page.locator('#commandInput').fill('Journal');
    await page.locator('#commandList .command-item').filter({ hasText:'Open Journal' }).click();
    await expect(page.locator('#page-diary')).toBeVisible();
    await expect(page.locator('#pageTitle')).toHaveText('Journal');

    await page.locator('#searchBtn').click();
    await expect(page.locator('#commandPalette')).toBeVisible();
    await page.locator('#commandInput').fill('Insights');
    await page.locator('#commandList .command-item').filter({ hasText:'Open Insights' }).click();
    await expect(page.locator('#page-insights')).toBeVisible();
  });

  test('mobile shell uses modern navigation without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width:390, height:844 });
    await enterDemo(page);

    await expect(page.locator('#mobileNav')).toBeVisible();
    await expect(page.locator('#mobileNav')).toContainText('Today');
    await expect(page.locator('#mobileNav')).toContainText('Plan');
    await expect(page.locator('#mobileNav')).toContainText('Journal');
    await expect(page.locator('#mobileNav')).toContainText('Insights');
    await expect(page.locator('#mobileNav')).toContainText('You');

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      quickAdd: document.querySelector('#quickAdd')?.getBoundingClientRect()
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.quickAdd.left).toBeGreaterThanOrEqual(0);
    expect(layout.quickAdd.right).toBeLessThanOrEqual(layout.viewport + 1);
  });
});
