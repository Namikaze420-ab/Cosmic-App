const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const A = { email: process.env.COSMIC_E2E_A_EMAIL, password: process.env.COSMIC_E2E_A_PASSWORD };
const B = { email: process.env.COSMIC_E2E_B_EMAIL, password: process.env.COSMIC_E2E_B_PASSWORD };
const enabled = Boolean(A.email && A.password && B.email && B.password);
const runTag = process.env.GITHUB_RUN_ID || String(Date.now());
const ASTRO_FIXTURE = Object.freeze({
  date: '2000-01-01',
  time: '12:00',
  place: 'Greenwich reference fixture',
  timezone: 'UTC',
  latitude: '51.4779',
  longitude: '0.0000',
  expectedAscendantSign: 'Aries',
  expectedAscendantDegree: 24.2662,
});

async function waitSdk(page) {
  await expect.poll(async () => page.evaluate(() => Boolean(window.supabase && window.CosmicAstrology && window.CosmicPalmAI && window.CosmicDiagnostics)), { timeout: 20000 }).toBe(true);
}

async function signIn(page, account) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitSdk(page);
  await page.locator('#authEmail').fill(account.email);
  await page.locator('#authPassword').fill(account.password);
  await page.locator('#authSubmit').click();
  await expect.poll(async () => page.evaluate(() => Boolean(state.user?.id)), { timeout: 20000 }).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    const onboard = document.querySelector('#onboardWrap');
    const shell = document.querySelector('.app-shell');
    return Boolean((onboard && !onboard.hidden) || (shell && !shell.hidden));
  }), { timeout: 20000 }).toBe(true);
}

async function onboard(page, name) {
  await expect(page.locator('#onboardWrap')).toBeVisible({ timeout: 15000 });
  await page.locator('#pName').fill(name);
  await page.locator('#pDate').fill(ASTRO_FIXTURE.date);
  await page.locator('#pTime').fill(ASTRO_FIXTURE.time);
  await page.locator('#pPlace').fill(ASTRO_FIXTURE.place);
  await page.locator('#pBirthTimezone').fill(ASTRO_FIXTURE.timezone);
  await page.locator('#pBirthLatitude').fill(ASTRO_FIXTURE.latitude);
  await page.locator('#pBirthLongitude').fill(ASTRO_FIXTURE.longitude);
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
  const card = page.locator('#page-insights .insight-module').filter({ hasText: 'Astrology · Meaning' });
  await expect(card).toBeVisible();
  await expect.poll(async () => page.evaluate(() => state.astrology?.status), { timeout: 20000 }).toBe('ready');
  const result = await page.evaluate(() => state.astrology?.data);
  expect(result.calculation_version).toBe('cosmic-alpha2-natal-v2');
  expect(result.houses.system).toBe('equal_house');
  expect(result.houses.cusps).toHaveLength(12);
  expect(result.houses.cusps[0].longitude).toBeCloseTo(result.ascendant.longitude, 5);
  expect(result.ascendant.sign).toBe(ASTRO_FIXTURE.expectedAscendantSign);
  expect(result.ascendant.degree_in_sign).toBeCloseTo(ASTRO_FIXTURE.expectedAscendantDegree, 2);
  expect(result.planets.Sun.equal_house).toBeGreaterThanOrEqual(1);
  expect(result.planets.Sun.equal_house).toBeLessThanOrEqual(12);
  await expect(card).toContainText('Your natal themes');
  await expect(card).toContainText(`Ascendant in ${ASTRO_FIXTURE.expectedAscendantSign}`);
  await expect(card).toContainText('What the 12 house numbers represent');
  await expect(card).not.toContainText('Astronomy Engine');
  await expect(card).not.toContainText('This is not Placidus');
}

async function palmConsentRoundTrip(page) {
  await page.locator('[data-page="insights"]:visible').first().click();
  await expect(page.locator('#palmAlpha2Section')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n0kAAAAASUVORK5CYII=', 'base64');
  await page.locator('#palmFileInput').setInputFiles({ name: `e2e-${runTag}.png`, mimeType: 'image/png', buffer: png });
  await page.locator('#uploadPalmBtn').click();
  await expect(page.locator('#palmUploadStatus')).toContainText('Private upload complete', { timeout: 20000 });

  const rows = await dbRows(page, 'palm_readings', 'id,storage_path,status');
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('uploaded');
  const id = rows[0].id;
  const panel = page.locator(`[data-palm-ai-panel="${id}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Uploading an image does not grant AI permission');

  await panel.locator('input[type="checkbox"]').check();
  await panel.locator('select').selectOption('7');
  await panel.locator('[data-grant-palm-ai]').click();
  await expect(page.locator(`[data-palm-ai-status="${id}"]`)).toContainText('Consent recorded', { timeout: 15000 });
  await expect.poll(async () => {
    const events = await dbRows(page, 'palm_processing_consent_events', 'reading_id,action,retention_days,consent_version');
    return events.some(event => event.reading_id === id && event.action === 'grant' && event.retention_days === 7 && event.consent_version === 'palm-ai-consent-v1');
  }).toBe(true);

  await page.locator(`[data-revoke-palm-ai="${id}"]`).click();
  await expect(page.locator(`[data-palm-ai-status="${id}"]`)).toContainText('withdrawn', { timeout: 15000 });
  await expect.poll(async () => {
    const events = await dbRows(page, 'palm_processing_consent_events', 'reading_id,action');
    return events.filter(event => event.reading_id === id).some(event => event.action === 'revoke');
  }).toBe(true);

  await page.locator(`[data-delete-palm="${id}"]`).click();
  await expect.poll(async () => (await dbRows(page, 'palm_readings', 'id')).length, { timeout: 15000 }).toBe(0);
  await expect.poll(async () => (await dbRows(page, 'palm_processing_consent_events', 'id')).length, { timeout: 15000 }).toBe(0);
}

async function diagnosticsRoundTrip(page) {
  await page.locator('[data-page="profile"]:visible').first().click();
  await expect(page.locator('#diagnosticsAlpha27')).toBeVisible();
  const toggle = page.locator('#diagnosticsOptIn');
  await expect(toggle).not.toBeChecked();

  const blocked = await page.evaluate(() => window.CosmicDiagnostics.report('js_error', 'alpha27-private-raw-material-blocked'));
  expect(blocked).toBe(false);

  await toggle.check();
  await expect.poll(async () => {
    const rows = await dbRows(page, 'user_preferences', 'diagnostics_opt_in');
    return rows[0]?.diagnostics_opt_in === true;
  }, { timeout: 10000 }).toBe(true);

  const inserted = await page.evaluate(() => window.CosmicDiagnostics.report('js_error', 'alpha27-private-raw-material'));
  expect(inserted).toBe(true);

  await toggle.uncheck();
  await expect.poll(async () => {
    const rows = await dbRows(page, 'user_preferences', 'diagnostics_opt_in');
    return rows[0]?.diagnostics_opt_in === false;
  }, { timeout: 10000 }).toBe(true);
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
  expect(parsed.export_version).toBe('alpha2-v2');
  expect(serialized).toContain(expectedPlannerTitle);
  expect(Array.isArray(parsed.privacy_safe_diagnostics)).toBe(true);
  expect(parsed.privacy_safe_diagnostics.length).toBeGreaterThanOrEqual(1);
  expect(serialized).not.toContain('alpha27-private-raw-material');
  expect(serialized).not.toMatch(/encrypted_refresh_token|client_secret|service_role|p256dh|auth_key/i);
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

test.describe.serial('Cosmic Planner Alpha 2.7 signed-in E2E', () => {
  test.skip(!enabled, 'Disposable E2E accounts are supplied only by the staging GitHub OIDC workflow.');

  test('real persistence, RLS, astrology, explicit palm consent, diagnostics, export and deletion', async ({ browser }) => {
    const titleA = `RLS-A-${runTag}`;
    const diaryA = `Diary-A-${runTag}`;
    const titleB = `RLS-B-${runTag}`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await ensureReady(pageA, 'E2E User A');
    await createPlannerItem(pageA, titleA);
    await createDiary(pageA, diaryA, `Private synthetic test content ${runTag}`);
    await assertAstrology(pageA);
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(async () => (await dbRows(pageA, 'planner_items', 'title')).some(r => r.title === titleA), { timeout: 15000 }).toBe(true);
    await contextA.close();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await ensureReady(pageB, 'E2E User B');

    expect((await dbRows(pageB, 'planner_items', 'title')).some(row => row.title === titleA)).toBe(false);
    expect((await dbRows(pageB, 'diary_entries', 'title')).some(row => row.title === diaryA)).toBe(false);

    await createPlannerItem(pageB, titleB);
    await assertAstrology(pageB);
    await palmConsentRoundTrip(pageB);
    await diagnosticsRoundTrip(pageB);
    await exportRoundTrip(pageB, titleB);
    await deleteAccountThroughUi(pageB);
    await contextB.close();
  });
});