export type PlannerItemLike = Readonly<{
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean | null;
}>;

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalCivilDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Expected date in YYYY-MM-DD format');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new Error('Invalid civil date');
  }
  return date;
}

export function addLocalDays(date: Date, days: number): Date {
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function durationMinutes(item: PlannerItemLike): number {
  if (item.all_day) return 0;
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at ?? '').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function clockMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function overnightAwareDuration(start: string, end: string): number | null {
  const startMinutes = clockMinutes(start);
  const endMinutes = clockMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  let duration = endMinutes - startMinutes;
  if (duration <= 0) duration += 1440;
  return duration;
}
