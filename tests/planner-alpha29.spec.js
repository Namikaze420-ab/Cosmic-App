const { test, expect } = require('@playwright/test');

async function enterDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#demoMode')).toBeVisible();
  await page.locator('#demoMode').click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicPlanner29))).toBe(true);
}

async function localDateOffset(page, days) {
  return page.evaluate((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return isoDate(date);
  }, days);
}

async function selectCalendarDate(page, date) {
  if (!(await page.locator('#page-calendar').isVisible().catch(() => false))) {
    await page.locator('[data-page="calendar"]:visible').first().click();
  }
  const target = new Date(`${date}T12:00:00`);
  const current = await page.evaluate(() => ({ year: state.calendarCursor.getFullYear(), month: state.calendarCursor.getMonth() }));
  const delta = (target.getFullYear() - current.year) * 12 + (target.getMonth() - current.month);
  for (let i = 0; i < Math.max(0, delta); i++) await page.locator('#nextMonth').click();
  for (let i = 0; i < Math.max(0, -delta); i++) await page.locator('#prevMonth').click();
  await page.locator(`[data-date="${date}"]`).click();
}

test.describe('Cosmic Planner Alpha 2.9 planner workflows', () => {
  test('duration, reminders, workload and week command view work in demo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await enterDemo(page);
    const tomorrow = await localDateOffset(page, 1);

    await page.locator('#quickAdd').click();
    await expect(page.locator('#taskEndTime')).toBeVisible();
    await expect(page.locator('#taskAllDay')).toBeVisible();
    await expect(page.locator('#taskRepeat')).toBeVisible();
    await page.locator('#taskTitle').fill('Alpha29 deep work');
    await page.locator('#taskDate').fill(tomorrow);
    await page.locator('#taskTime').fill('09:00');
    await page.locator('#taskEndTime').fill('17:30');
    await expect(page.locator('#taskDurationReadout')).toContainText('8h 30m');
    await page.locator('[name="taskReminder"][value="15"]').uncheck();
    await page.locator('[name="taskReminder"][value="30"]').check();
    await page.locator('#taskSubmit').click();

    await selectCalendarDate(page, tomorrow);
    const task = page.locator('.selected-plan-list .timeline-item').filter({ hasText: 'Alpha29 deep work' });
    await expect(task).toContainText('8h 30m');
    await expect(task).toContainText('30m');
    await expect(page.locator('.selected-load')).toContainText('Overloaded');

    await page.locator('[data-page="home"]:visible').first().click();
    await expect(page.locator('[data-planner-view="week"]')).toBeVisible();
    await page.locator('[data-planner-view="week"]').click();
    await expect(page.locator('.week-command-card')).toBeVisible();
    await expect(page.locator('.week-agenda')).toContainText('Alpha29 deep work');
  });

  test('recurring plans and all-day plans are bounded and editable in demo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await enterDemo(page);
    const day1 = await localDateOffset(page, 2);
    const day2 = await localDateOffset(page, 3);
    const day3 = await localDateOffset(page, 4);
    const day5 = await localDateOffset(page, 6);

    await page.locator('#quickAdd').click();
    await page.locator('#taskTitle').fill('Alpha29 recurring focus');
    await page.locator('#taskDate').fill(day1);
    await page.locator('#taskTime').fill('10:00');
    await page.locator('#taskEndTime').fill('11:15');
    await page.locator('#taskRepeat').selectOption('daily');
    await expect(page.locator('#taskRepeatUntilField')).toBeVisible();
    await page.locator('#taskRepeatUntil').fill(day3);
    await page.locator('#taskSubmit').click();

    await expect.poll(async () => page.evaluate(() => state.tasks.filter(task => task.title === 'Alpha29 recurring focus').length)).toBe(3);
    await expect.poll(async () => page.evaluate(() => state.tasks.filter(task => task.title === 'Alpha29 recurring focus').every(task => task.recurrence_rule === 'daily' && Boolean(task.recurrence_group_id)))).toBe(true);

    await selectCalendarDate(page, day2);
    const recurring = page.locator('.selected-plan-list .timeline-item').filter({ hasText: 'Alpha29 recurring focus' });
    await expect(recurring).toContainText('Daily');
    await recurring.locator('[data-task-action="delete-future"]').click();
    await expect.poll(async () => page.evaluate(() => state.tasks.filter(task => task.title === 'Alpha29 recurring focus').length)).toBe(1);

    await page.locator('#quickAdd').click();
    await page.locator('#taskTitle').fill('Alpha29 all day');
    await page.locator('#taskDate').fill(day5);
    await page.locator('#taskAllDay').check();
    await expect(page.locator('#taskDurationReadout')).toHaveText('All-day plan');
    await page.locator('#taskSubmit').click();
    await selectCalendarDate(page, day5);
    const allDay = page.locator('.selected-plan-list .timeline-item').filter({ hasText: 'Alpha29 all day' });
    await expect(allDay).toContainText('All day');
    await expect(page.locator('.selected-load')).toContainText('0 min timed');
  });
});
