const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience32))).toBe(true);
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('#page-home')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 3.2 activation and daily rhythm', () => {
  test('first-session guide turns the first visit into three useful actions without blocking the app', async ({ page }) => {
    await enterDemo(page);

    const guide = page.locator('#alpha32Activation');
    await expect(guide).toBeVisible();
    await expect(guide).toContainText('FIRST 5 MINUTES · 0/3');
    await expect(guide.locator('[data-alpha32-activation]')).toHaveCount(3);

    await page.locator('[data-alpha32-activation="guidance"]').click();
    await expect(page.locator('#page-insights')).toBeVisible();
    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('#alpha32Activation')).toContainText('FIRST 5 MINUTES · 1/3');

    await page.locator('[data-alpha32-activation="plan"]').click();
    await expect(page.locator('#modalBackdrop')).toBeVisible();
    await page.locator('#closeModal').click();
    await expect(page.locator('#alpha32Activation')).toContainText('FIRST 5 MINUTES · 2/3');

    await page.locator('[data-alpha32-activation="journal"]').click();
    await expect(page.locator('#page-diary')).toBeVisible();
    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('#alpha32Activation')).toHaveCount(0);

    const saved = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(item => item.startsWith('cosmic.activation.alpha32:'));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    });
    expect(saved.complete).toBe(true);
    expect(saved.steps).toEqual({ guidance:true, plan:true, journal:true });
  });

  test('Daily Rhythm adapts to local time and real plan state while staying viewport safe', async ({ page }) => {
    await page.setViewportSize({ width:390, height:844 });
    await enterDemo(page);

    const rhythm = page.locator('#dailyRhythmCard');
    await expect(rhythm).toBeVisible();
    await expect(rhythm).toHaveAttribute('data-rhythm-phase', /morning|midday|evening|late/);
    await expect(rhythm.locator('[data-alpha32-rhythm]')).toHaveCount(2);

    const copy = await rhythm.innerText();
    expect(copy).toMatch(/MORNING SETUP|MIDDAY RESET|EVENING REFLECTION|LATE-DAY RESET/);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      rhythm: document.querySelector('#dailyRhythmCard')?.getBoundingClientRect()
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.rhythm.left).toBeGreaterThanOrEqual(0);
    expect(layout.rhythm.right).toBeLessThanOrEqual(layout.viewport + 1);
  });

  test('the first-session guide can be intentionally restored from You', async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(() => {
      window.CosmicExperience32.markActivationStep('guidance');
      window.CosmicExperience32.markActivationStep('plan');
      window.CosmicExperience32.markActivationStep('journal');
    });
    await page.locator('[data-page="profile"]:visible').first().click();

    const settings = page.locator('#alpha32RhythmSettings');
    await expect(settings).toBeVisible();
    await expect(settings).toContainText('Completed');
    await page.locator('#alpha32ResetGuide').click();
    await expect(settings).toContainText('0/3 explored');

    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('#alpha32Activation')).toBeVisible();
  });
});
