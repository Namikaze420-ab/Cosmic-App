export const GUIDANCE_FOCUS_AREAS = Object.freeze([
  'work','relationships','money','wellbeing','growth'
] as const);

export const GUIDANCE_STYLES = Object.freeze([
  'practical','balanced','reflective'
] as const);

export type GuidanceFocusArea = (typeof GUIDANCE_FOCUS_AREAS)[number];
export type GuidanceStyle = (typeof GUIDANCE_STYLES)[number];

export type GuidancePreferences = Readonly<{
  focusAreas: readonly GuidanceFocusArea[];
  style: GuidanceStyle;
}>;

const FOCUS_SET = new Set<string>(GUIDANCE_FOCUS_AREAS);
const STYLE_SET = new Set<string>(GUIDANCE_STYLES);

export function normalizeFocusAreas(value: unknown): GuidanceFocusArea[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<GuidanceFocusArea>();
  for (const item of value) {
    const candidate = String(item);
    if (!FOCUS_SET.has(candidate)) continue;
    unique.add(candidate as GuidanceFocusArea);
    if (unique.size === 3) break;
  }
  return [...unique];
}

export function normalizeGuidanceStyle(value: unknown): GuidanceStyle {
  const candidate = String(value ?? '');
  return STYLE_SET.has(candidate) ? candidate as GuidanceStyle : 'balanced';
}

export function normalizeGuidancePreferences(value: unknown): GuidancePreferences {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    focusAreas:normalizeFocusAreas(source.focus_areas ?? source.focusAreas),
    style:normalizeGuidanceStyle(source.guidance_style ?? source.style),
  };
}
