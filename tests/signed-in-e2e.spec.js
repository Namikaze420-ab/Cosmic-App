const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const A = { email: process.env.COSMIC_E2E_A_EMAIL, password: process.env.COSMIC_E2E_A_PASSWORD };
const B = { email: process.env.COSMIC_E2E_B_EMAIL, password: process.env.COSMIC_E2E_B_PASSWORD };
const enabled = Boolean(A.email && A.password && B.email && B.password);
const runTag = process.env.GITHUB_RUN_ID || String(Date.now());

async function waitSdk(page) {
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase && window.CosmicAstrology)), { timeout: 20000 }).toBe(true);
}

async function signIn(page, account) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitSdk(page);
  await page.locator('#authEmail').fill(account.email);
  await page.locator('#authPassword').fill(account.password);
  await page.locator('#authSubmit').click();
  await expect.poll(async () => page.evaluate(() => Boolean(state.user?.id)), { timeout: 20000 }).toBe(true);
}

async function onboard(page, name) {
  await expect(page.locator('#onboardWrap')).toBeVisible({ timeout: 15000 });
  await page.locator('#pName').fill(name);
  await page.locator('#pDate').fill('1995-03-15');
  await page.locator('#pTime').fill('02:25');
  await page.locator('#pPlace').fill('Mahebourg, Mauritius');
  await page.locator('#pBirthTimezone').fill('Indian/Mauritius');
  await page.locator('#pBirthLatitude').fill('-20.4081');
  await page.locator('#pBirthLongitude').fill('57.7000');
  await page.locator('#pConsent').check();
  await page.locator('#onboardForm button[type="submit"]').click();
  await expect(page.locator('#onboardWrap')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => state.profile?.onboarding_completed === true)).toBe(true);
}

async function ensureReady(page, name) {
  await signIn(page, name === 'E2E User A' ? A : B);
  const needsOnboarding = await page.locator('#onboardWrap').isVisible().catch(() => false);
  if (needsOnboarding) await onboard(page, name);
  else await expect(page.locator('.app-shell')).toBeVisible();
}

async function dbRows(page, table, columns = '*') {
  return page.evaluate(async ({ table, columns }) => {
    const { data, error } = await sb.from(table).select(columns);
    if (error) throw new Error(error.message);
    return data || [];
  }, { table, columns });
}

async function createPlannerItem(page, title) {
  await page.locator('#quickAdd').click();
  await page.locator('#taskTitle').fill(title);
  await page.locator('#taskTime').fill('14:45');
  await page.locator('#taskForm button[type="submit"]').click();
  await expect(page.locator('#modalBackdrop')).toBeHidden();
  await expect.poll(async () => {
    const rows = await dbRows(page, 'planner_items', 'title');
    return rows.some(row => row.title === title);
  }, { timeout: 15000 }).toBe(true);
}

async function createDiary(page, title, content) {
  await page.locator('[data-page="diary"]:visible').first().click();
  await page.locator('#diaryTitle').fill(title);
  await page.locator('#diaryEditor').fill(content);
  await expect(page.locator('#diarySave')).toContainText(/Saved|Cloud/i, { timeout: 15000 });
  await expect.poll(async () => {
    const rows = await dbRows(page, 'diary_entries', 'title,content');
    return rows.some(row => row.title === title && row.content === content);
  }, { timeout: 15000 }).toBe(true);
}

async function assertAstrology(page) {
  await page.locator('[data-page="insights"]:visible').first().click();
  const card = page.locator('#page-insights .insight-module').filter({ hasText: 'Astrology · Alpha 2.6' });
  await expect(card).toBeVisible();
  await expect.poll(async () => page.evaluate(() => state.astrology?.status), { timeout: 20000 }).toBe('ready');
  const result = await page.evaluate(() => state.astrology?.data);
  expect(result.calculation_version).toBe('cosmic-alpha2-natal-v2');
  expect(result.houses.system).toBe('equal_house');
  expect(result.houses.cusps).toHaveLength(12);
  expect(result.houses.cusps[0].longitude).toBeCloseTo(result.ascendant.longitude, 5);
  expect(result.planets.Sun.equal_house).toBeGreaterThanOrEqual(1);
  expect(result.planets.Sun.equal_house).toBeLessThanOrEqual(12);
  await expect(card).toContainText('Equal House');
  await expect(card).toContainText('This is not Placidus');
}

async function palmRoundTrip(page) {
  await page.locator('[data-page="insights"]:visible').first().click();
  await expect(page.locator('#palmAlpha2Section')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n0kAAAAASUVORK5CYII=', 'base64');
  await page.locator('#palmFileInput').setInputFiles({ name: `e2e-${runTag}.png`, mimeType: 'image/png', buffer: png });
  await page.locator('#uploadPalmBtn').click();
  await expect(page.locator('#palmUploadStatus')).toContainText('Private upload complete', { timeout: 20000 });
  let rows = await dbRows(page, 'palm_readings', 'id,storage_path,status');
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('uploaded');
  await page.locator(`[data-delete-palm="${rows[0].id}"]`).click();
  await expect.poll(async () => (await dbRows(page, 'palm_readings', 'id')).length, { timeout: 15000 }).toBe(0);
}

async function exportRoundTrip(page, expectedPlannerTitle) {
  await page.locator('[data-page="profile"]:visible').first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportAccountBtn').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const parsed = JSON.parse(await fs.readFile(path, 'utf8'));
  const serialized = JSON.stringify(parsed);
  expect(serialized).toContain(expectedPlannerTitle);
  expect(serialized).not.toMatch(/encrypted_refresh_token|client_secret|service_role/i);
  await expect(page.locator('#privacyStatus')).toContainText('Export downloaded');
}

async function deleteAccountThroughUi(page) {
  await page.locator('[data-page="profile"]:visible').first().click();
  await page.locator('#deleteAccountBtn').click();
  await expect(page.locator('#accountDeleteDialog')).toBeVisible();
  await page.locator('#deleteAccountPhrase').fill('DELETE');
  await expect(page.locator('#confirmDeleteAccount')).toBeEnabled();
  await page.locator('#confirmDeleteAccount').click();
  await expect(page.locator('#deleteAccountStatus')).toContainText('Account deleted', { timeout: 20000 });
  await expect(page.locator('#authGate')).toBeVisible({ timeout: 10000 });
}

test.describe.serial('Cosmic Planner Alpha 2.6 signed-in E2E', () => {
  test.skip(!enabled, 'Disposable E2E accounts are supplied only by the staging GitHub OIDC workflow.');

  test('real persistence, RLS isolation, astrology, private storage, export and deletion', async ({ browser }) => {
    const titleA = `RLS-A-${runTag}`;
    const diaryA = `Diary-A-${runTag}`;
    const titleB = `RLS-B-${runTag}`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await ensureReady(pageA, 'E2E User A');
    await createPlannerItem(pageA, titleA);
    await createDiary(pageA, diaryA, `Private A content ${runTag}`);
    await assertAstrology(pageA);
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(async () => (await dbRows(pageA, 'planner_items', 'title')).some(r => r.title === titleA), { timeout: 15000 }).toBe(true);
    await contextA.close();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await ensureReady(pageB, 'E2E User B');

    // Real user-B JWT + RLS must not expose user-A rows.
    expect((await dbRows(pageB, 'planner_items', 'title')).some(row => row.title === titleA)).toBe(false);
    expect((await dbRows(pageB, 'diary_entries', 'title')).some(row => row.title === diaryA)).toBe(false);

    await createPlannerItem(pageB, titleB);
    await assertAstrology(pageB);
    await palmRoundTrip(pageB);
    await exportRoundTrip(pageB, titleB);
    await deleteAccountThroughUi(pageB);
    await contextB.close();
  });
});
