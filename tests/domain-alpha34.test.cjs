const test = require('node:test');
const assert = require('node:assert/strict');

const numerology = require('../.domain-build/numerology.js');
const zodiac = require('../.domain-build/chinese-zodiac.js');
const score = require('../.domain-build/cosmic-score.js');
const guidance = require('../.domain-build/guidance-preferences.js');
const planner = require('../.domain-build/planner-time.js');

test('typed numerology preserves current master-number and personal-number behavior', () => {
  assert.equal(numerology.reduceNumber(11), 11);
  assert.equal(numerology.reduceNumber(22), 22);
  assert.equal(numerology.reduceNumber(33), 33);
  assert.equal(numerology.lifePath('1995-03-15'), 33);
  assert.deepEqual(
    numerology.personalNumbers('1995-03-15', { year:2026, month:9, day:7 }),
    { universalYear:10, personalYear:1, personalMonth:1, personalDay:8 },
  );
});

test('typed Chinese Zodiac respects Lunar New Year boundaries', () => {
  assert.equal(zodiac.chineseRelatedYear(new Date('2026-02-16T12:00:00Z'), 'UTC'), 2025);
  assert.equal(zodiac.chineseRelatedYear(new Date('2026-02-17T12:00:00Z'), 'UTC'), 2026);
  assert.deepEqual(zodiac.zodiacForYear(1995), { year:1995, animal:'Pig', element:'Wood' });
  assert.deepEqual(zodiac.zodiacForYear(2026), { year:2026, animal:'Horse', element:'Fire' });
});

test('typed zodiac harmony and Cosmic Score reproduce the legacy reference fixture', () => {
  const harmony = zodiac.zodiacHarmony(
    new Date('1995-03-15T12:00:00Z'),
    new Date('2026-09-07T12:00:00Z'),
    'UTC',
  );
  assert.equal(harmony.score, 72);
  assert.equal(score.numerologyScore(8), 88);
  assert.equal(score.cosmicScore(88, harmony.score), 82);
  assert.equal(score.taskAlignmentScore(82, true, 'high'), 91);
  assert.equal(score.taskAlignmentScore(98, true, 'high'), 98);
});

test('typed guidance preferences enforce the Alpha 3.3 database/UI contract', () => {
  assert.deepEqual(
    guidance.normalizeFocusAreas(['work','money','work','invalid','wellbeing','growth']),
    ['work','money','wellbeing'],
  );
  assert.deepEqual(guidance.normalizeFocusAreas('work'), []);
  assert.equal(guidance.normalizeGuidanceStyle('reflective'), 'reflective');
  assert.equal(guidance.normalizeGuidanceStyle('invented'), 'balanced');
  assert.deepEqual(
    guidance.normalizeGuidancePreferences({ focus_areas:['growth','relationships'], guidance_style:'practical' }),
    { focusAreas:['growth','relationships'], style:'practical' },
  );
});

test('typed planner utilities preserve local civil dates and overnight durations', () => {
  const civil = planner.parseLocalCivilDate('2026-09-07');
  assert.equal(planner.localIsoDate(civil), '2026-09-07');
  assert.equal(planner.localIsoDate(planner.addLocalDays(civil, 1)), '2026-09-08');
  assert.equal(planner.clockMinutes('14:30'), 870);
  assert.equal(planner.clockMinutes('24:00'), null);
  assert.equal(planner.overnightAwareDuration('23:30','00:30'), 60);
  assert.equal(planner.durationMinutes({
    starts_at:'2026-09-07T14:30:00.000Z',
    ends_at:'2026-09-07T15:45:00.000Z',
    all_day:false,
  }), 75);
  assert.equal(planner.durationMinutes({
    starts_at:'2026-09-07T00:00:00.000Z',
    ends_at:'2026-09-08T00:00:00.000Z',
    all_day:true,
  }), 0);
});
