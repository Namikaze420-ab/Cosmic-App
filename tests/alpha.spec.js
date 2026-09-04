const { test, expect } = require('@playwright/test');

function collectClientErrors(page) {
  const state = { errors: [], ignoreExpectedAuth400: false };

  page.on('pageerror', err => {
    state.errors.push(`pageerror: ${err.message || err}`);
  });

  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const expectedAuth400 = state.ignoreExpectedAuth400 &&
      /Failed to load resource: the server responded with a status of 400/i.test(text);
    if (!expectedAuth400) state.errors.push(`console: ${text}`);
  });

  return state;
}

function visibleNav(page, id) {
  return page.locator(`[data-page="${id}"]:visible`).first();
}

async function exerciseAlpha(page) {
  const client = collectClientErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#authGate')).toBeVisible();
  await expect(page.locator('#authToggle')).toBeVisible();
  await expect(page.locator('#demoMode')).toBeVisible();
  await expect(page.locator('#forgotPassword')).toBeVisible();

  // Recovery control validates locally and must not send a request without an email.
  await page.locator('#forgotPassword').click();
  await expect(page.locator('#authMsg')).toContainText('Enter the email address');

  // Authentication mode control must respond immediately.
  await page.locator('#authToggle').click();
  await expect(page.locator('#authTitle')).toHaveText('Create your account');
  await expect(page.locator('#authSubmit')).toHaveText('Create account');
  await page.locator('#authToggle').click();
  await expect(page.locator('#authTitle')).toHaveText('Welcome back');

  // Confirm the Supabase browser SDK loads. This does not create a user.
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase)), { timeout: 15000 }).toBe(true);
  expect(client.errors, `Errors before auth request: ${client.errors.join('\n')}`).toEqual([]);

  // Regression test for: "sb.rpc(...).catch is not a function".
  // Supabase PostgREST builders are awaitable thenables, but not native Promises.
  // Mock that exact shape: it has .then() and deliberately has no .catch().
  const rpcCompatible = await page.evaluate(async () => {
    const original = {
      mode: state.mode,
      user: state.user,
      profile: state.profile,
      rpc: sb.rpc,
    };

    state.mode = 'live';
    state.user = { id: 'qa-rpc-user' };
    state.profile = {
      display_name: 'QA',
      birth_date: '1995-03-15',
      onboarding_completed: true,
    };

    sb.rpc = () => ({
      then(resolve) {
        resolve({ data: null, error: null });
      },
    });

    try {
      return await persistInsight();
    } finally {
      state.mode = original.mode;
      state.user = original.user;
      state.profile = original.profile;
      sb.rpc = original.rpc;
    }
  });
  expect(rpcCompatible).toBe(true);

  // Exercise a real Auth request with deliberately invalid credentials.
  // Supabase correctly returns HTTP 400 for invalid credentials; Chrome logs that
  // resource response as a console error, so suppress only that expected interval.
  client.ignoreExpectedAuth400 = true;
  await page.locator('#authEmail').fill('qa-nonexistent@example.com');
  await page.locator('#authPassword').fill('not-a-real-password');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#authMsg')).toContainText(/not accepted|Forgot password/i, { timeout: 15000 });
  client.ignoreExpectedAuth400 = false;

  // Demo mode must dismiss the auth overlay and reveal a functional app.
  await page.locator('#demoMode').click();
  await expect(page.locator('#authGate')).toBeHidden();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('#pageTitle')).toHaveText('Today');
  await expect(page.locator('.hero-card')).toHaveCount(1);

  // Main navigation. Use the visible nav so the same test works on desktop sidebar
  // and mobile bottom navigation. Alpha 3.1 intentionally uses product-first labels.
  for (const [id, title] of [['calendar','Plan'],['diary','Journal'],['insights','Insights'],['profile','You'],['home','Today']]) {
    await visibleNav(page, id).click();
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

  // Journal must accept and save demo content.
  await visibleNav(page, 'diary').click();
  await page.locator('#diaryTitle').fill('Automated QA diary');
  await page.locator('#diaryEditor').fill('Browser-driven QA content.');
  await page.waitForTimeout(1000);
  await expect(page.locator('#diarySave')).toContainText(/Saved|Local/i);

  expect(client.errors, `Unexpected client errors: ${client.errors.join('\n')}`).toEqual([]);
}

test.describe('Cosmic Planner staging core', () => {
  test('desktop core flows work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await exerciseAlpha(page);
  });

  test('mobile core flows work', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await exerciseAlpha(page);
  });
});
