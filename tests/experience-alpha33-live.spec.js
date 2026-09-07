const { test, expect } = require('@playwright/test');

const account = { email:process.env.COSMIC_E2E_A_EMAIL, password:process.env.COSMIC_E2E_A_PASSWORD };
const enabled = Boolean(account.email && account.password);

async function signIn(page) {
  await page.goto('/', { waitUntil:'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.CosmicExperience33 && window.supabase)), { timeout:20000 }).toBe(true);
  await page.locator('#authEmail').fill(account.email);
  await page.locator('#authPassword').fill(account.password);
  await page.locator('#authSubmit').click();
  await expect.poll(async () => page.evaluate(() => Boolean(state.user?.id)), { timeout:20000 }).toBe(true);

  if (await page.locator('#onboardWrap').isVisible().catch(() => false)) {
    await page.locator('#pName').fill('Alpha 3.3 E2E');
    await page.locator('#pDate').fill('2000-01-01');
    await page.locator('#pTime').fill('12:00');
    await page.locator('#pPlace').fill('Greenwich reference fixture');
    await page.locator('#pBirthTimezone').fill('UTC');
    await page.locator('#pBirthLatitude').fill('51.4779');
    await page.locator('#pBirthLongitude').fill('0.0000');
    await page.locator('#pConsent').check();
    await page.locator('#onboardForm button[type="submit"]').click();
  }
  await expect(page.locator('.app-shell')).toBeVisible({ timeout:20000 });
}

test.describe.serial('Cosmic Planner Alpha 3.3 signed-in personalization', () => {
  test.skip(!enabled, 'Disposable E2E account is supplied only by the staging GitHub OIDC workflow.');

  test('explicit priorities persist in the private user_preferences row and survive reload', async ({ page }) => {
    await signIn(page);

    await page.evaluate(async () => {
      const { error } = await sb.from('user_preferences')
        .update({ focus_areas:[], guidance_style:'balanced' })
        .eq('user_id', state.user.id);
      if (error) throw new Error(error.message);
      state.preferences = { ...(state.preferences || {}), focus_areas:[], guidance_style:'balanced' };
    });

    await page.locator('[data-page="profile"]:visible').first().click();
    await expect(page.locator('#alpha33GuidanceSettings')).toBeVisible();
    await page.locator('[data-alpha33-focus="work"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas)).toEqual(['work']);
    await page.locator('[data-alpha33-focus="growth"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas)).toEqual(['work','growth']);
    await page.locator('[data-alpha33-style="reflective"]').click();
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().guidance_style)).toBe('reflective');

    const persisted = await page.evaluate(async () => {
      const { data, error } = await sb.from('user_preferences')
        .select('user_id,focus_areas,guidance_style')
        .eq('user_id', state.user.id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    });
    expect(persisted.focus_areas).toEqual(['work','growth']);
    expect(persisted.guidance_style).toBe('reflective');

    await page.reload({ waitUntil:'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => Boolean(state.user?.id && window.CosmicExperience33)), { timeout:20000 }).toBe(true);
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().focus_areas), { timeout:20000 }).toEqual(['work','growth']);
    await expect.poll(async () => page.evaluate(() => window.CosmicExperience33.currentPreferences().guidance_style), { timeout:20000 }).toBe('reflective');

    await page.evaluate(async () => {
      const { error } = await sb.from('user_preferences')
        .update({ focus_areas:[], guidance_style:'balanced' })
        .eq('user_id', state.user.id);
      if (error) throw new Error(error.message);
      state.preferences = { ...(state.preferences || {}), focus_areas:[], guidance_style:'balanced' };
    });
  });
});
