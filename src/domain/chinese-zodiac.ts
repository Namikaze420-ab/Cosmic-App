export const ZODIAC_ANIMALS = Object.freeze([
  'Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'
] as const);

export const ZODIAC_ELEMENTS = Object.freeze([
  'Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'
] as const);

export type ZodiacAnimal = (typeof ZODIAC_ANIMALS)[number];
export type ZodiacElement = (typeof ZODIAC_ELEMENTS)[number];

export type ChineseZodiac = Readonly<{
  year: number;
  animal: ZodiacAnimal;
  element: ZodiacElement;
}>;

export type ZodiacHarmony = Readonly<{
  score: number;
  natal: ChineseZodiac;
  current: ChineseZodiac;
}>;

const TRINES: readonly (readonly ZodiacAnimal[])[] = Object.freeze([
  Object.freeze(['Rat','Dragon','Monkey'] as const),
  Object.freeze(['Ox','Snake','Rooster'] as const),
  Object.freeze(['Tiger','Horse','Dog'] as const),
  Object.freeze(['Rabbit','Goat','Pig'] as const),
]);

const OPPOSITES: Readonly<Record<ZodiacAnimal, ZodiacAnimal>> = Object.freeze({
  Rat:'Horse', Horse:'Rat', Ox:'Goat', Goat:'Ox', Tiger:'Monkey', Monkey:'Tiger',
  Rabbit:'Rooster', Rooster:'Rabbit', Dragon:'Dog', Dog:'Dragon', Snake:'Pig', Pig:'Snake'
});

const CREATES: Readonly<Record<ZodiacElement, ZodiacElement>> = Object.freeze({
  Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood'
});

const CONTROLS: Readonly<Record<ZodiacElement, ZodiacElement>> = Object.freeze({
  Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood'
});

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function zodiacForYear(year: number): ChineseZodiac {
  const animal = ZODIAC_ANIMALS[positiveModulo(year - 4, 12)];
  const element = ZODIAC_ELEMENTS[positiveModulo(year - 4, 10)];
  if (!animal || !element) throw new Error('Could not resolve Chinese Zodiac year');
  return { year, animal, element };
}

export function chineseRelatedYear(date: Date, timeZone?: string): number {
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  const formatter = new Intl.DateTimeFormat('en-u-ca-chinese', {
    year:'numeric', month:'numeric', day:'numeric', ...(timeZone ? { timeZone } : {})
  });
  const related = formatter.formatToParts(date).find(part => part.type === 'relatedYear')?.value;
  const year = Number(related);
  if (!Number.isInteger(year)) throw new Error('Chinese calendar related year unavailable');
  return year;
}

export function chineseZodiac(date: Date, timeZone?: string): ChineseZodiac {
  return zodiacForYear(chineseRelatedYear(date, timeZone));
}

export function zodiacHarmony(
  natalDate: Date,
  currentDate: Date,
  timeZone?: string,
): ZodiacHarmony {
  const natal = chineseZodiac(natalDate, timeZone);
  const current = chineseZodiac(currentDate, timeZone);
  let score = 68;

  if (TRINES.some(group => group.includes(natal.animal) && group.includes(current.animal))) score = 86;
  if (natal.animal === current.animal) score = 72;
  if (OPPOSITES[natal.animal] === current.animal) score = 50;

  if (natal.element === current.element) score += 5;
  else if (CREATES[natal.element] === current.element || CREATES[current.element] === natal.element) score += 4;
  else if (CONTROLS[natal.element] === current.element || CONTROLS[current.element] === natal.element) score -= 5;

  return { score:clamp(score, 42, 94), natal, current };
}
