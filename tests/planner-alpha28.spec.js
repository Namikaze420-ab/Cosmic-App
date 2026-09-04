const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#demoMode')).toBeVisible();
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPlanner28))).toBe(true);
}

async function localDateOffset(page, days) {
  return page.evaluate((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return isoDate(date);
  }, days);
}

async function selectCalendarDate(page, date) {
  const target = new Date(`${date}T12:00:00`);
  const current = await page.evaluate(() => ({ year: state.calendarCursor.getFullYear(), month: state.calendarCursor.getMonth() }));
  const delta = (target.getFullYear() - current.year) * 12 + (target.getMonth() - current.month);
  if (delta > 0) {
    for (let i = 0; i < delta; i++) await page.locator('#nextMonth').click();
  } else if (delta < 0) {
    for (let i = 0; i < Math.abs(delta); i++) await page.locator('#prevMonth').click();
  }
  await page.locator(`[data-date="${date}"]`).click();
  await expect(page.locator('.selected-day-panel')).toContainText(date.split('-')[2].replace(/^0/, ''));
}

test.describe('Cosmic Planner Alpha 2.8 planner', () => {
  test('future plans can be created, edited and reviewed in weekly workload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 });
    await enterDemo(page);
    const tomorrow = await localDateOffset(page, 1);

    await page.locator('#quickAdd').click();
    await expect(page.locator('#taskDate')).toHaveValue(await localDateOffset(page, 0));
    await page.locator('#taskTitle').fill('Future planning QA');
    await page.locator('#taskDate').fill(tomorrow);
    await page.locator('#taskTime').fill('16:15');
    await page.locator('#taskForm button[type="submit"]').click();
    await expect(page.locator('#modalBackdrop')).toBeHidden();

    await page.locator('[data-page="calendar"]:visible').first().click();
    await expect(page.locator('.week-card')).toBeVisible();
    await selectCalendarDate(page, tomorrow);
    await expect(page.locator('.selected-day-panel')).toContainText('Future planning QA');
    await expect(page.locator(`[data-date="${tomorrow}"] .plan-count`)).toHaveText('1');

    const task = page.locator('.selected-plan-list .timeline-item').filter({ hasText: 'Future planning QA' });
    await task.locator('[data-task-action="edit"]').click();
    await expect(page.locator('#modalTitle')).toHaveText('Edit plan');
    await expect(page.locator('#taskDate')).toHaveValue(tomorrow);
    await expect(page.locator('#taskTime')).toHaveValue('16:15');
    await page.locator('#taskTitle').fill('Future planning QA edited');
    await page.locator('#taskTime').fill('17:00');
    await page.locator('#taskSubmit').click();
    await expect(page.locator('#modalBackdrop')).toBeHidden();
    await expect(page.locator('.selected-day-panel')).toContainText('Future planning QA edited');
    await expect(page.locator('.selected-day-panel')).toContainText('17:00');

    const weekDay = page.locator(`[data-week-date="${tomorrow}"]`);
    await expect(weekDay).toContainText('1 plan');
    await expect(weekDay).toContainText('1h');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#demoMode').click();
    await page.locator('[data-page="calendar"]:visible').first().click();
    await selectCalendarDate(page, tomorrow);
    await expect(page.locator('.selected-day-panel')).toContainText('Future planning QA edited');
  });
});
