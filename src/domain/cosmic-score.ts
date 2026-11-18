export const NUMEROLOGY_SCORES: Readonly<Record<number, number>> = Object.freeze({
  1:76, 2:69, 3:82, 4:67, 5:80, 6:77, 7:71, 8:88, 9:74, 11:90, 22:92, 33:94
});

export const COSMIC_SCORE_WEIGHTS = Object.freeze({ numerology:0.65, chineseZodiac:0.35 } as const);

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function numerologyScore(personalDay: number): number {
  return NUMEROLOGY_SCORES[personalDay] ?? 72;
}

export function cosmicScore(numerology: number, chineseZodiac: number): number {
  const weighted = numerology * COSMIC_SCORE_WEIGHTS.numerology
    + chineseZodiac * COSMIC_SCORE_WEIGHTS.chineseZodiac;
  return Math.round(weighted);
}

export function taskAlignmentScore(
  baseScore: number,
  categoryMatchesDailyTheme: boolean,
  priority: string,
): number {
  const themeBonus = categoryMatchesDailyTheme ? 8 : 0;
  const priorityBonus = priority.toLowerCase() === 'high' ? 1 : 0;
  return clampScore(baseScore + themeBonus + priorityBonus, 30, 98);
}
