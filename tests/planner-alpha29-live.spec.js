const { test, expect } = require('@playwright/test');

const account = {
  email: process.env.COSMIC_E2E_A_EMAIL,
  password: process.env.COSMIC_E2E_A_PASSWORD,
};
const enabled = Boolean(account.email && account.password);
const tag = process.env.GITHUB_RUN_ID || String(Date.now());

async function waitSdk(page) {
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase && window.CosmicPlanner29)), { timeout: 20000 }).toBe(true);
}

async function signInAndPrepare(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitSdk(page);
  if (await page.locator('#authGate').isVisible().catch(() => false)) {
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
    await page.locator('#pName').fill('Alpha 2.9 Planner E2E');
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

async function futureDate(page, offset) {
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

test.describe('Cosmic Planner Alpha 2.9 signed-in recurrence', () => {
  test.skip(!enabled, 'Disposable signed-in account is supplied by the staging OIDC workflow.');

  test('recurrence, duration and reminders persist and future-series edits remain scoped', async ({ page }) => {
    await signInAndPrepare(page);
    const date1 = await futureDate(page, 20);
    const date3 = await futureDate(page, 22);
    const original = `Alpha29-live-${tag}`;
    const edited = `${original}-edited`;

    await page.locator('#quickAdd').click();
    await page.locator('#taskTitle').fill(original);
    await page.locator('#taskDate').fill(date1);
    await page.locator('#taskTime').fill('08:30');
    await page.locator('#taskEndTime').fill('10:00');
    await page.locator('[name="taskReminder"][value="15"]').uncheck();
    await page.locator('[name="taskReminder"][value="30"]').check();
    await page.locator('#taskRepeat').selectOption('daily');
    await page.locator('#taskRepeatUntil').fill(date3);
    await page.locator('#taskSubmit').click();
    await expect(page.locator('#modalBackdrop')).toBeHidden();

    await expect.poll(async () => page.evaluate(async title => {
      const { data, error } = await sb.from('planner_items').select('id,starts_at,ends_at,reminder_minutes,recurrence_rule,recurrence_group_id').eq('title', title).order('starts_at');
      if (error || !data || data.length !== 3) return false;
      return data.every(row => row.recurrence_rule === 'daily' && Boolean(row.recurrence_group_id) && Array.isArray(row.reminder_minutes) && row.reminder_minutes.includes(30) && (new Date(row.ends_at) - new Date(row.starts_at)) === 90 * 60000);
    }, original), { timeout: 15000 }).toBe(true);

    await selectDate(page, date1);
    const task = page.locator('.selected-plan-list .timeline-item').filter({ hasText: original });
    await task.locator('[data-task-action="edit"]').click();
    await expect(page.locator('#taskSeriesScopeField')).toBeVisible();
    await page.locator('#taskSeriesScope').selectOption('future');
    await page.locator('#taskTitle').fill(edited);
    await page.locator('#taskTime').fill('09:15');
    await page.locator('#taskEndTime').fill('11:15');
    await page.locator('#taskSubmit').click();

    await expect.poll(async () => page.evaluate(async ({ oldTitle, newTitle }) => {
      const oldResult = await sb.from('planner_items').select('id').eq('title', oldTitle);
      const newResult = await sb.from('planner_items').select('starts_at,ends_at,recurrence_group_id').eq('title', newTitle).order('starts_at');
      if (oldResult.error || newResult.error) return false;
      const rows = newResult.data || [];
      return (oldResult.data || []).length === 0 && rows.length === 3 && rows.every(row => Boolean(row.recurrence_group_id) && (new Date(row.ends_at) - new Date(row.starts_at)) === 120 * 60000);
    }, { oldTitle: original, newTitle: edited }), { timeout: 15000 }).toBe(true);

    await selectDate(page, date1);
    const editedTask = page.locator('.selected-plan-list .timeline-item').filter({ hasText: edited });
    await editedTask.locator('[data-task-action="delete-future"]').click();
    await expect.poll(async () => page.evaluate(async title => {
      const { data, error } = await sb.from('planner_items').select('id').eq('title', title);
      return error ? -1 : (data || []).length;
    }, edited), { timeout: 15000 }).toBe(0);
  });
});
