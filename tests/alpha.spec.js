const { test, expect } = require('@playwright/test');

async function collectClientErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message || err}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

async function exerciseAlpha(page) {
  const errors = await collectClientErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#authGate')).toBeVisible();
  await expect(page.locator('#authToggle')).toBeVisible();
  await expect(page.locator('#demoMode')).toBeVisible();

  // Authentication mode control must respond immediately.
  await page.locator('#authToggle').click();
  await expect(page.locator('#authTitle')).toHaveText('Create your account');
  await expect(page.locator('#authSubmit')).toHaveText('Create account');
  await page.locator('#authToggle').click();
  await expect(page.locator('#authTitle')).toHaveText('Welcome back');

  // Confirm the Supabase browser SDK loads. This does not create a user.
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase)), { timeout: 15000 }).toBe(true);

  // Exercise a real Auth request with deliberately invalid credentials.
  // Success means the form is wired to Supabase and returns an error instead of doing nothing.
  await page.locator('#authEmail').fill('qa-nonexistent@example.com');
  await page.locator('#authPassword').fill('not-a-real-password');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#authMsg')).not.toHaveText(/^(|Signing in…)$/, { timeout: 15000 });

  // Demo mode must dismiss the auth overlay and reveal a functional app.
  await page.locator('#demoMode').click();
  await expect(page.locator('#authGate')).toBeHidden();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('#pageTitle')).toHaveText('Today');
  await expect(page.locator('.hero-card')).toHaveCount(1);

  // Main navigation.
  for (const [id, title] of [['calendar','Calendar'],['diary','Diary'],['insights','Insights'],['profile','Profile'],['home','Today']]) {
    await page.locator(`[data-page="${id}"]`).first().click();
    await expect(page.locator('#pageTitle')).toHaveText(title);
    await expect(page.locator(`#page-${id}`)).toBeVisible();
  }

  // Add a demo planner item.
  await page.locator('#quickAdd').click();
  await expect(page.locator('#modalBackdrop')).toBeVisible();
  await page.locator('#taskTitle').fill('Automated QA task');
  await page.locator('#taskTime').fill('14:45');
  await page.locator('#taskForm button[type="submit"]').click();
  await expect(page.locator('#modalBackdrop')).toBeHidden();
  await expect(page.locator('#page-home')).toContainText('Automated QA task');

  // Diary must accept and save demo content.
  await page.locator('[data-page="diary"]').first().click();
  await page.locator('#diaryTitle').fill('Automated QA diary');
  await page.locator('#diaryEditor').fill('Browser-driven QA content.');
  await page.waitForTimeout(1000);
  await expect(page.locator('#diarySave')).toContainText(/Saved|Local/i);

  expect(errors, `Client errors: ${errors.join('\n')}`).toEqual([]);
}

test.describe('Cosmic Planner Alpha 1 staging', () => {
  test('desktop core flows work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await exerciseAlpha(page);
  });

  test('mobile core flows work', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await exerciseAlpha(page);
  });
});
