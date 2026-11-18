export const MASTER_NUMBERS = Object.freeze([11, 22, 33] as const);

export type CivilDate = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

export type PersonalNumbers = Readonly<{
  universalYear: number;
  personalYear: number;
  personalMonth: number;
  personalDay: number;
}>;

function isMaster(value: number): boolean {
  return MASTER_NUMBERS.includes(value as (typeof MASTER_NUMBERS)[number]);
}

export function reduceNumber(value: number | string): number {
  let current = Math.abs(Number(value) || 0);
  while (current > 9 && !isMaster(current)) {
    current = String(current)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return current;
}

export function lifePath(birthDate: string): number {
  const total = birthDate
    .replace(/\D/g, '')
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  return reduceNumber(total);
}

export function parseCivilDate(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Expected date in YYYY-MM-DD format');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) throw new Error('Invalid civil date');
  return { year, month, day };
}

export function personalNumbers(birthDate: string, date: CivilDate): PersonalNumbers {
  const birth = parseCivilDate(birthDate);
  const universalYear = String(date.year)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  const personalYear = reduceNumber(birth.month + birth.day + universalYear);
  const personalMonth = reduceNumber(personalYear + date.month);
  const personalDay = reduceNumber(personalMonth + date.day);
  return { universalYear, personalYear, personalMonth, personalDay };
}
