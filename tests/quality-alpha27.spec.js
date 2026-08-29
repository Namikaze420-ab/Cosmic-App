const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#demoMode')).toBeVisible();
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

test.describe('Cosmic Planner Alpha 2.7 quality budgets', () => {
  test('interactive controls have names, labels and visible focus treatment', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterDemo(page);

    const violations = await page.evaluate(() => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const issues = [];
      const ids = new Map();
      document.querySelectorAll('[id]').forEach((el) => ids.set(el.id, (ids.get(el.id) || 0) + 1));
      for (const [id, count] of ids) if (count > 1) issues.push(`duplicate-id:${id}`);

      document.querySelectorAll('button').forEach((button) => {
        if (!visible(button)) return;
        const name = (button.getAttribute('aria-label') || button.textContent || '').trim();
        if (!name) issues.push('unnamed-button');
      });

      document.querySelectorAll('input,select,textarea').forEach((control) => {
        if (!visible(control) || control.type === 'hidden') return;
        const labelled = Boolean(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || control.labels?.length);
        if (!labelled) issues.push(`unlabelled-control:${control.id || control.tagName}`);
      });
      return issues;
    });
    expect(violations).toEqual([]);

    await page.locator('#quickAdd').focus();
    const focusStyle = await page.locator('#quickAdd').evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle };
    });
    expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(focusStyle.outlineStyle).not.toBe('none');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedDuration = await page.locator('#quickAdd').evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(reducedDuration).toMatch(/0\.001ms|0s/);
  });

  test('staging shell stays within deterministic resource and startup budgets', async ({ page }) => {
    const failed = [];
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1') && response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    await enterDemo(page);
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const localResources = performance.getEntriesByType('resource').filter((entry) => entry.name.startsWith(location.origin));
      return {
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
        resourceCount: localResources.length,
        encodedBytes: localResources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0),
      };
    });

    expect(failed).toEqual([]);
    expect(metrics.domContentLoaded).toBeLessThan(5000);
    expect(metrics.resourceCount).toBeLessThan(35);
    expect(metrics.encodedBytes).toBeLessThan(1_500_000);
  });
});
