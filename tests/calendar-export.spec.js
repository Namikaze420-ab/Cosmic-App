const fs = require('node:fs/promises');
const { test, expect } = require('@playwright/test');

test('export the selected day with reminders, local all-day dates and Unicode titles', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demoMode').click();
  await page.evaluate(() => {
    const date = parseDate('2030-01-15');
    state.selectedDate = state.calendarCursor = date;
    const base = { category:'work', priority:'medium', status:'planned', source:'cosmic_planner', reminder_minutes:[0,15] };
    state.tasks = [
      { ...base, id:'night', title:'Café, soirée; ' + '🌙'.repeat(25), starts_at:'2030-01-15T23:30:00', ends_at:'2030-01-16T00:45:00' },
      { ...base, id:'day', title:'All day', all_day:true, starts_at:'2030-01-15T00:00:00' },
      { ...base, id:'import', title:'Imported', source:'google_calendar', starts_at:'2030-01-15T12:00:00' },
      { ...base, id:'other', title:'Tomorrow', starts_at:'2030-01-16T12:00:00' },
    ];
    setPage('calendar');
  });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name:'Export day (.ics)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('cosmic-plans-2030-01-15.ics');
  const content = await fs.readFile(await file.path(), 'utf8');
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(content).toContain('DTSTART;VALUE=DATE:20300115\r\nDTEND;VALUE=DATE:20300116');
  expect(content).toContain('TRIGGER:-PT15M');
  expect(content).toContain('TRIGGER:PT0M');
  expect(content.replaceAll('\r\n ', '')).toContain('Café\\, soirée\\; ' + '🌙'.repeat(25));
  expect(content).not.toMatch(/Imported|Tomorrow/);
  expect(content.split('\r\n').every(line => Buffer.byteLength(line) <= 75)).toBe(true);
});
