const { test, expect } = require('@playwright/test');

test.describe('Cosmic Planner password policy', () => {
  test('signup rejects weak passwords before network submission', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#authGate')).toBeVisible();
    await page.locator('#authToggle').click();
    await expect(page.locator('#authSubmit')).toHaveText('Create account');
    await expect(page.locator('#passwordPolicyHint')).toContainText('16+ characters');

    let signupRequests = 0;
    page.on('request', request => {
      if (request.url().includes('/auth/v1/signup')) signupRequests += 1;
    });

    await page.locator('#authEmail').fill('qa-policy@example.com');
    await page.locator('#authPassword').fill('Weakpass1!');
    await page.locator('#authSubmit').click();

    await expect(page.locator('#authMsg')).toContainText('at least 16 characters');
    expect(signupRequests).toBe(0);
  });

  test('policy validator accepts only full-strength new passwords', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPasswordPolicy))).toBe(true);

    const results = await page.evaluate(() => ({
      short: window.CosmicPasswordPolicy.validate('Short1!a'),
      missingUpper: window.CosmicPasswordPolicy.validate('lowercase123456!'),
      missingLower: window.CosmicPasswordPolicy.validate('UPPERCASE123456!'),
      missingNumber: window.CosmicPasswordPolicy.validate('StrongPassword!!'),
      missingSymbol: window.CosmicPasswordPolicy.validate('StrongPassword1234'),
      strong: window.CosmicPasswordPolicy.validate('StrongPassword16!'),
      minLength: window.CosmicPasswordPolicy.policy.minLength,
    }));

    expect(results.minLength).toBe(16);
    expect(results.short).toContain('at least 16');
    expect(results.missingUpper).toContain('uppercase');
    expect(results.missingLower).toContain('lowercase');
    expect(results.missingNumber).toContain('number');
    expect(results.missingSymbol).toContain('symbol');
    expect(results.strong).toBe('');
  });
});
