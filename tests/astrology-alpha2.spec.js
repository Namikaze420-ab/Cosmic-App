const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 astrology foundation', () => {
  test('birth timezone conversion is deterministic and onboarding captures it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicAstrology))).toBe(true);

    const converted = await page.evaluate(() =>
      window.CosmicAstrology.localBirthToUtc('2026-01-15', '12:00', 'Indian/Mauritius')
    );
    expect(converted).toBe('2026-01-15T08:00:00.000Z');

    await page.evaluate(() => showOnboarding());
    await expect(page.locator('#pBirthTimezone')).toBeVisible();
    await expect(page.locator('#pBirthTimezone')).not.toHaveValue('');
    await expect(page.locator('#onboardWrap')).toContainText('astronomical calculations');
  });

  test('demo mode never fabricates astrology results', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#demoMode').click();
    await expect(page.locator('#authGate')).toBeHidden();

    await page.locator('#desktopNav [data-page="insights"]').click();
    const astrology = page.locator('#page-insights .insight-module').filter({ hasText: 'Astrology · Alpha 2' });
    await expect(astrology).toBeVisible();
    await expect(astrology).toContainText('Sign in required');
    await expect(astrology).toContainText('does not fabricate astrology results');
  });
});
