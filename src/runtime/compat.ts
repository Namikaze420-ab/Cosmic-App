import * as numerology from '../domain/numerology';
import * as zodiac from '../domain/chinese-zodiac';
import * as score from '../domain/cosmic-score';
import * as guidance from '../domain/guidance-preferences';
import * as planner from '../domain/planner-time';

// These adapters preserve Alpha 3.4's browser contracts. The stricter domain
// APIs remain available to new callers; a runtime migration must not silently
// change persisted shapes, local-date semantics or legacy fallback values.
function parseDate(value: string): Date {
  try { return planner.parseLocalCivilDate(value); }
  catch {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year!, month! - 1, day!, 12);
  }
}

function personalNumbers(birth: string, date: Date) {
  const normalizedBirth = parseDate(birth);
  const numbers = numerology.personalNumbers(planner.localIsoDate(normalizedBirth), {
    year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(),
  });
  // universalYear is an internal domain intermediate, not part of the UI/RPC contract.
  return { personalYear:numbers.personalYear, personalMonth:numbers.personalMonth, personalDay:numbers.personalDay };
}

function chinese(date: Date) {
  try { return zodiac.chineseZodiac(date); }
  catch (error) {
    // Preserve the legacy Gregorian fallback only when Intl omits relatedYear.
    if (error instanceof Error && error.message === 'Chinese calendar related year unavailable') {
      return zodiac.zodiacForYear(date.getFullYear());
    }
    throw error;
  }
}

function durationMinutes(item: planner.PlannerItemLike): number {
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at as string).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
  // Legacy duration is elapsed time even for an all-day item. Workload callers
  // explicitly exclude all-day items; changing this API would change displays.
  return Math.max(1, planner.durationMinutes({ starts_at:item.starts_at, ends_at:new Date(end).toISOString(), all_day:false }));
}

function clockMinutes(value: string): number | null {
  const minutes = planner.clockMinutes(value);
  if (minutes !== null) return minutes;
  // HTML time controls cannot produce out-of-range clocks, but old callers can.
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, remainder] = value.split(':').map(Number);
  return hours! * 60 + remainder!;
}

function overnightDuration(start: string, end: string): number | null {
  const duration = planner.overnightAwareDuration(start, end);
  if (duration !== null) return duration;
  const first = clockMinutes(start), last = clockMinutes(end);
  if (first === null || last === null) return null;
  const delta = last - first;
  return delta <= 0 ? delta + 1440 : delta;
}

export const adapters = Object.freeze({
  numerology: Object.freeze({ reduce:numerology.reduceNumber, lifePath:numerology.lifePath, personalNumbers }),
  chineseZodiac: Object.freeze({
    chinese,
    zodiacHarmony: (birth: string, date: Date) => zodiac.harmonyForZodiacs(chinese(parseDate(birth)), chinese(date)),
  }),
  cosmicScore: Object.freeze({
    numerologyScore:score.numerologyScore,
    cosmicScore:score.cosmicScore,
    taskAlignmentScore:score.taskAlignmentScore,
  }),
  guidance: Object.freeze({
    cleanFocus:guidance.normalizeFocusAreas,
    cleanStyle: (value: unknown) => guidance.normalizeGuidanceStyle(typeof value === 'string' ? value : undefined),
  }),
  plannerTime: Object.freeze({
    isoDate:planner.localIsoDate, parseDate, addDays:planner.addLocalDays,
    durationMinutes, clockMinutes, overnightDuration,
  }),
});
