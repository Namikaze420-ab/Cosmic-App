const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner Alpha 2 astrology foundation', () => {
  test('birth timezone conversion and coordinate validation are deterministic', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicAstrology))).toBe(true);

    const result = await page.evaluate(() => ({
      converted: window.CosmicAstrology.localBirthToUtc('2026-01-15', '12:00', 'Indian/Mauritius'),
      valid: window.CosmicAstrology.parseCoordinates('-20.4081', '57.7000'),
      missingPair: window.CosmicAstrology.parseCoordinates('-20.4081', ''),
      badLatitude: window.CosmicAstrology.parseCoordinates('91', '57.7'),
      badLongitude: window.CosmicAstrology.parseCoordinates('-20.4', '181'),
    }));

    expect(result.converted).toBe('2026-01-15T08:00:00.000Z');
    expect(result.valid).toEqual({ valid: true, latitude: -20.4081, longitude: 57.7 });
    expect(result.missingPair.valid).toBe(false);
    expect(result.badLatitude.valid).toBe(false);
    expect(result.badLongitude.valid).toBe(false);

    await page.evaluate(() => showOnboarding());
    await expect(page.locator('#pBirthTimezone')).toBeVisible();
    await expect(page.locator('#pBirthLatitude')).toBeVisible();
    await expect(page.locator('#pBirthLongitude')).toBeVisible();
    await expect(page.locator('#pBirthTimezone')).not.toHaveValue('');
    await expect(page.locator('#onboardWrap')).toContainText('Ascendant/house');
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