const { test, expect } = require('@playwright/test');

const account = {
  email: process.env.COSMIC_E2E_A_EMAIL,
  password: process.env.COSMIC_E2E_A_PASSWORD,
};
const enabled = Boolean(account.email && account.password);
const tag = process.env.GITHUB_RUN_ID || String(Date.now());

async function waitSdk(page) {
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase && window.CosmicPlanner28)), { timeout: 20000 }).toBe(true);
}

async function signInAndPrepare(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitSdk(page);
  const gateVisible = await page.locator('#authGate').isVisible().catch(() => false);
  if (gateVisible) {
    await page.locator('#authEmail').fill(account.email);
    await page.locator('#authPassword').fill(account.password);
    await page.locator('#authSubmit').click();
  }
  await expect.poll(async () => page.evaluate(() => Boolean(state.user?.id)), { timeout: 20000 }).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    const onboard = document.querySelector('#onboardWrap');
    const shell = document.querySelector('.app-shell');
    return Boolean((onboard && !onboard.hidden) || (shell && !shell.hidden));
  }), { timeout: 20000 }).toBe(true);

  if (await page.locator('#onboardWrap').isVisible().catch(() => false)) {
    await page.locator('#pName').fill('Alpha 2.8 Planner E2E');
    await page.locator('#pDate').fill('2000-01-01');
    await page.locator('#pTime').fill('12:00');
    await page.locator('#pPlace').fill('Greenwich reference fixture');
    await page.locator('#pBirthTimezone').fill('UTC');
    await page.locator('#pBirthLatitude').fill('51.4779');
    await page.locator('#pBirthLongitude').fill('0.0000');
    await page.locator('#pConsent').check();
    await page.locator('#onboardForm button[type="submit"]').click();
    await expect(page.locator('#onboardWrap')).toBeHidden({ timeout: 20000 });
  }
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function futureDate(page, offset = 10) {
  return page.evaluate(days => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }, offset);
}

async function selectDate(page, date) {
  await page.locator('[data-page="calendar"]:visible').first().click();
  const target = new Date(`${date}T12:00:00`);
  const cursor = await page.evaluate(() => ({ year: state.calendarCursor.getFullYear(), month: state.calendarCursor.getMonth() }));
  const delta = (target.getFullYear() - cursor.year) * 12 + target.getMonth() - cursor.month;
  for (let index = 0; index < Math.max(0, delta); index++) await page.locator('#nextMonth').click();
  for (let index = 0; index < Math.max(0, -delta); index++) await page.locator('#prevMonth').click();
  await page.locator(`[data-date="${date}"]`).click();
}

test.describe('Cosmic Planner Alpha 2.8 signed-in planner', () => {
  test.skip(!enabled, 'Disposable signed-in account is supplied by the staging OIDC workflow.');

  test('future plan create, edit, reload and delete persist through Supabase', async ({ page }) => {
    await signInAndPrepare(page);
    const date = await futureDate(page);
    const original = `Future-live-${tag}`;
    const edited = `${original}-edited`;

    await page.locator('#quickAdd').click();
    await page.locator('#taskTitle').fill(original);
    await page.locator('#taskDate').fill(date);
    await page.locator('#taskTime').fill('16:20');
    await page.locator('#taskSubmit').click();
    await expect(page.locator('#modalBackdrop')).toBeHidden();

    await expect.poll(async () => page.evaluate(async ({ title, date }) => {
      const { data, error } = await sb.from('planner_items').select('starts_at').eq('title', title).maybeSingle();
      if (error || !data) return false;
      return isoDate(new Date(data.starts_at)) === date;
    }, { title: original, date }), { timeout: 15000 }).toBe(true);

    await selectDate(page, date);
    await expect(page.locator('.selected-day-panel')).toContainText(original);
    const task = page.locator('.selected-plan-list .timeline-item').filter({ hasText: original });
    await task.locator('[data-task-action="edit"]').click();
    await page.locator('#taskTitle').fill(edited);
    await page.locator('#taskTime').fill('18:05');
    await page.locator('#taskSubmit').click();
    await expect(page.locator('.selected-day-panel')).toContainText(edited);
    await expect(page.locator('.selected-day-panel')).toContainText('18:05');

    await expect.poll(async () => page.evaluate(async ({ title, date }) => {
      const { data, error } = await sb.from('planner_items').select('starts_at').eq('title', title).maybeSingle();
      if (error || !data) return false;
      return isoDate(new Date(data.starts_at)) === date;
    }, { title: edited, date }), { timeout: 15000 }).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitSdk(page);
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 20000 });
    await selectDate(page, date);
    await expect(page.locator('.selected-day-panel')).toContainText(edited);

    const persisted = page.locator('.selected-plan-list .timeline-item').filter({ hasText: edited });
    await persisted.locator('[data-task-action="delete"]').click();
    await expect.poll(async () => page.evaluate(async title => {
      const { data, error } = await sb.from('planner_items').select('id').eq('title', title);
      if (error) return -1;
      return (data || []).length;
    }, edited), { timeout: 15000 }).toBe(0);
  });
});
