const { test, expect } = require('@playwright/test');

function visibleNav(page, id) {
  return page.locator(`[data-page="${id}"]:visible`).first();
}

test.describe('Alpha 3.0 interpretation-first Insights', () => {
  test('demo Insights explain what results mean without showing calculation mechanics', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#demoMode').click();
    await visibleNav(page, 'insights').click();

    // Alpha 3.1 keeps the interpretation-first foundation while leading with personal guidance.
    await expect(page.locator('#pageEyebrow')).toHaveText('PERSONAL GUIDANCE');
    await expect(page.locator('#page-insights')).toContainText('What it represents:');
    await expect(page.locator('#page-insights')).toContainText('Personal Year');
    await expect(page.locator('#page-insights')).toContainText('Personal Month');
    await expect(page.locator('#page-insights')).toContainText('Personal Day');
    await expect(page.locator('#page-insights')).toContainText('How to use it');
    await expect(page.locator('#insightMeaningGuide')).toBeVisible();
    await expect(page.locator('#insightMeaningGuide')).toContainText('80–100 · Favorable');
    await expect(page.locator('#insightMeaningGuide')).toContainText('40–59 · Neutral / mixed');

    await expect(page.locator('#page-insights .formula')).toHaveCount(0);
    await expect(page.locator('#page-insights')).not.toContainText('Daily score =');
    await expect(page.locator('#page-insights')).not.toContainText('No random number generation');
    await expect(page.locator('#page-insights')).not.toContainText('Lunar New Year boundaries');
    await expect(page.locator('#page-insights')).not.toContainText('Astronomy Engine');
  });

  test('meaning helpers classify scores and numerology consistently', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(() => ({
      high: window.CosmicInsightMeanings.scoreBand(88),
      medium: window.CosmicInsightMeanings.scoreBand(67),
      low: window.CosmicInsightMeanings.scoreBand(32),
      eight: window.CosmicInsightMeanings.numberMeaning(8),
      houseTen: window.CosmicInsightMeanings.houseMeanings[10],
    }));

    expect(result.high.label).toBe('Favorable');
    expect(result.medium.label).toBe('Supportive');
    expect(result.low.label).toBe('Caution');
    expect(result.eight.title).toContain('Ambition');
    expect(result.houseTen).toContain('career');
  });
});
