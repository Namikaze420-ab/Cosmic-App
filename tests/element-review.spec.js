const { test, expect } = require('@playwright/test');

async function demo(page) {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.CosmicExperience31Safety))).toBe(true);
  await page.locator('#demoMode').click();
}
const nav = (page, key) => page.locator(`nav [data-page="${key}"]:visible`).first();

test('journal retains the latest text, title and mood across navigation and reload', async ({ page }) => {
  await demo(page);
  await nav(page, 'diary').click();
  await page.getByLabel('Entry title').fill('Wednesday');
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByLabel('Journal entry', { exact: true }).fill('Keep this draft.');
  await nav(page, 'home').click();
  await nav(page, 'diary').click();
  await expect(page.getByLabel('Journal entry', { exact: true })).toHaveValue('Keep this draft.');
  await demo(page);
  await nav(page, 'diary').click();
  await expect(page.getByLabel('Entry title')).toHaveValue('Wednesday');
  await expect(page.getByRole('button', { name: 'Good', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Journal entry', { exact: true })).toHaveValue('Keep this draft.');
});

test('calendar selection and plan priority are announced and the plan form returns focus', async ({ page }) => {
  await demo(page);
  await nav(page, 'calendar').click();
  await expect(nav(page, 'calendar')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.day-cell.muted').first()).toBeDisabled();
  const day = page.locator('.day-cell[data-date]:not(.muted)').first();
  await day.click();
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(day).toBeFocused();
  await page.locator('#quickAdd').focus();
  await page.keyboard.press('Enter');
  const modal = page.getByRole('dialog');
  await expect(modal.getByLabel('Title', { exact: true })).toBeFocused();
  await modal.getByRole('button', { name: 'High', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'High', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await modal.locator('#taskSubmit').focus();
  await page.keyboard.press('Tab');
  await expect(modal.locator('#closeModal')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal.locator('#taskSubmit')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#commandPalette')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#quickAdd')).toBeFocused();
});

test('profile edits can be abandoned and quick actions can be dismissed with zero matches', async ({ page }) => {
  await demo(page);
  await nav(page, 'profile').click();
  const edit = page.locator('#editProfile');
  await edit.focus();
  await page.keyboard.press('Enter');
  await page.locator('#pName').fill('Abandoned edit');
  await page.locator('#cancelProfile').click();
  await expect(edit).toBeFocused();
  await expect(page.locator('#page-profile')).not.toContainText('Abandoned edit');
  await page.keyboard.press('Control+k');
  await page.locator('#commandInput').fill('no-such-action');
  await expect(page.locator('.command-empty')).toBeVisible();
  await page.locator('#closeCommands').click();
  await expect(edit).toBeFocused();
});

test('a delayed cloud write cannot overwrite a newer journal entry', async ({ page }) => {
  await demo(page);
  await nav(page, 'diary').click();
  await page.evaluate(() => {
    state.mode = 'live';
    window.recordedWrites = [];
    sb = { from: () => ({ upsert: async row => {
      window.recordedWrites.push(row.content);
      if (window.recordedWrites.length === 1) await new Promise(resolve => { window.finishFirstWrite = resolve; });
      return { error: null };
    } }) };
  });
  await page.locator('#diaryEditor').fill('First');
  await expect.poll(() => page.evaluate(() => window.recordedWrites)).toEqual(['First']);
  await page.locator('#diaryEditor').fill('Newest');
  await page.evaluate(() => { flushDiary(); });
  await expect(page.locator('#diarySave')).toHaveText('Saving…');
  await page.evaluate(() => window.finishFirstWrite());
  await expect(page.locator('#diarySave')).toHaveText('Cloud saved');
  expect(await page.evaluate(() => window.recordedWrites)).toEqual(['First', 'Newest']);
});
