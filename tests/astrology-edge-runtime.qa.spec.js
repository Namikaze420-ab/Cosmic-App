const { test, expect } = require('@playwright/test');

// Temporary runtime probe. This file is removed after the public calculation-only
// QA endpoint is verified; the production astrology-calc function remains JWT-protected.
test('deployed astronomy engine returns real planetary positions', async ({ request }) => {
  const response = await request.get(
    'https://azziyvcgnxxnzpvlaijd.supabase.co/functions/v1/astrology-calc-qa?timestamp_utc=2026-08-29T12%3A00%3A00.000Z'
  );
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.version).toBe('2.1.19');
  expect(body.planets.Sun.sign).toBeTruthy();
  expect(body.planets.Moon.sign).toBeTruthy();
  expect(body.planets.Mercury.longitude).toBeGreaterThanOrEqual(0);
  expect(body.planets.Mercury.longitude).toBeLessThan(360);
  expect(Object.keys(body.planets)).toHaveLength(10);
});
