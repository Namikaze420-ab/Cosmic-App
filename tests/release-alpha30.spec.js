const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#demoMode')).toBeVisible();
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPlanner29))).toBe(true);
}

async function dateOffset(page, days) {
  return page.evaluate((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return isoDate(date);
  }, days);
}

test.describe('Cosmic Planner Alpha 3.0 release matrix', () => {
  test('critical demo planner journey remains usable', async ({ page }) => {
    await enterDemo(page);

    await expect(page.locator('#page-home')).toBeVisible();
    await page.locator('#quickAdd').click();
    await expect(page.locator('#modalBackdrop')).toBeVisible();
    await expect(page.locator('#taskEndTime')).toBeVisible();
    await expect(page.locator('#taskRepeat')).toBeVisible();

    const repeatUntil = await dateOffset(page, 14);
    await page.locator('#taskTitle').fill('Alpha30 release matrix plan');
    await page.locator('#taskTime').fill('09:00');
    await page.locator('#taskEndTime').fill('10:30');
    await page.locator('#taskRepeat').selectOption('weekly');
    await page.locator('#taskRepeatUntil').fill(repeatUntil);
    await page.locator('[name="taskReminder"][value="15"]').uncheck();
    await page.locator('[name="taskReminder"][value="30"]').check();
    await page.locator('#taskSubmit').click();

    await expect.poll(async () => page.evaluate(() => state.tasks.filter(task => task.title === 'Alpha30 release matrix plan').length)).toBe(3);

    await page.locator('[data-page="calendar"]:visible').first().click();
    await expect(page.locator('#page-calendar')).toBeVisible();
    await expect(page.locator('#page-calendar')).toContainText('Alpha30 release matrix plan');

    await page.locator('[data-page="diary"]:visible').first().click();
    await expect(page.locator('#page-diary')).toBeVisible();
    await page.locator('[data-page="insights"]:visible').first().click();
    await expect(page.locator('#page-insights')).toBeVisible();
    await page.locator('[data-page="profile"]:visible').first().click();
    await expect(page.locator('#page-profile')).toBeVisible();
  });

  test('responsive shell, planner modal and PWA metadata are release-safe', async ({ page }) => {
    await enterDemo(page);

    const pwa = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const manifest = await fetch(manifestLink.href).then(response => response.json());
      const icon = manifest.icons?.[0];
      const iconStatus = icon ? await fetch(new URL(icon.src, manifestLink.href)).then(response => response.status) : 0;
      return {
        display: manifest.display,
        hasScope: Boolean(manifest.scope),
        iconCount: manifest.icons?.length || 0,
        iconStatus,
      };
    });
    expect(pwa.display).toBe('standalone');
    expect(pwa.hasScope).toBe(true);
    expect(pwa.iconCount).toBeGreaterThan(0);
    expect(pwa.iconStatus).toBe(200);

    await page.locator('#quickAdd').click();
    await expect(page.locator('#modalBackdrop')).toBeVisible();

    const viewportOk = await page.evaluate(() => {
      const modal = document.querySelector('.modal');
      const rect = modal.getBoundingClientRect();
      const pageFits = document.documentElement.scrollWidth <= window.innerWidth + 1;
      return pageFits && rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
    });
    expect(viewportOk).toBe(true);

    await expect(page.locator('#taskAllDay')).toBeVisible();
    await page.locator('#taskAllDay').check();
    await expect(page.locator('#taskDurationReadout')).toHaveText('All-day plan');
    await page.locator('#cancelTask').click();
    await expect(page.locator('#modalBackdrop')).toBeHidden();
  });
});
