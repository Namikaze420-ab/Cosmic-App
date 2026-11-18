// Generated from src/domain and src/runtime. Run npm run build:runtime; do not edit.
(() => {
  // src/domain/numerology.ts
  var MASTER_NUMBERS = Object.freeze([11, 22, 33]);
  function isMaster(value) {
    return MASTER_NUMBERS.includes(value);
  }
  function reduceNumber(value) {
    let current = Math.abs(Number(value) || 0);
    while (current > 9 && !isMaster(current)) {
      current = String(current).split("").reduce((sum, digit) => sum + Number(digit), 0);
    }
    return current;
  }
  function lifePath(birthDate) {
    const total = birthDate.replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
    return reduceNumber(total);
  }
  function parseCivilDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error("Expected date in YYYY-MM-DD format");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const probe = new Date(Date.UTC(year, month - 1, day, 12));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day) throw new Error("Invalid civil date");
    return { year, month, day };
  }
  function personalNumbers(birthDate, date) {
    const birth = parseCivilDate(birthDate);
    const universalYear = String(date.year).split("").reduce((sum, digit) => sum + Number(digit), 0);
    const personalYear = reduceNumber(birth.month + birth.day + universalYear);
    const personalMonth = reduceNumber(personalYear + date.month);
    const personalDay = reduceNumber(personalMonth + date.day);
    return { universalYear, personalYear, personalMonth, personalDay };
  }

  // src/domain/chinese-zodiac.ts
  var ZODIAC_ANIMALS = Object.freeze([
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
    "Monkey",
    "Rooster",
    "Dog",
    "Pig"
  ]);
  var ZODIAC_ELEMENTS = Object.freeze([
    "Wood",
    "Wood",
    "Fire",
    "Fire",
    "Earth",
    "Earth",
    "Metal",
    "Metal",
    "Water",
    "Water"
  ]);
  var TRINES = Object.freeze([
    Object.freeze(["Rat", "Dragon", "Monkey"]),
    Object.freeze(["Ox", "Snake", "Rooster"]),
    Object.freeze(["Tiger", "Horse", "Dog"]),
    Object.freeze(["Rabbit", "Goat", "Pig"])
  ]);
  var OPPOSITES = Object.freeze({
    Rat: "Horse",
    Horse: "Rat",
    Ox: "Goat",
    Goat: "Ox",
    Tiger: "Monkey",
    Monkey: "Tiger",
    Rabbit: "Rooster",
    Rooster: "Rabbit",
    Dragon: "Dog",
    Dog: "Dragon",
    Snake: "Pig",
    Pig: "Snake"
  });
  var CREATES = Object.freeze({
    Wood: "Fire",
    Fire: "Earth",
    Earth: "Metal",
    Metal: "Water",
    Water: "Wood"
  });
  var CONTROLS = Object.freeze({
    Wood: "Earth",
    Earth: "Water",
    Water: "Fire",
    Fire: "Metal",
    Metal: "Wood"
  });
  function positiveModulo(value, divisor) {
    return (value % divisor + divisor) % divisor;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function zodiacForYear(year) {
    const animal = ZODIAC_ANIMALS[positiveModulo(year - 4, 12)];
    const element = ZODIAC_ELEMENTS[positiveModulo(year - 4, 10)];
    if (!animal || !element) throw new Error("Could not resolve Chinese Zodiac year");
    return { year, animal, element };
  }
  function chineseRelatedYear(date, timeZone) {
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
    const formatter = new Intl.DateTimeFormat("en-u-ca-chinese", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      ...timeZone ? { timeZone } : {}
    });
    const related = formatter.formatToParts(date).find((part) => String(part.type) === "relatedYear")?.value;
    const year = Number(related);
    if (!Number.isInteger(year)) throw new Error("Chinese calendar related year unavailable");
    return year;
  }
  function chineseZodiac(date, timeZone) {
    return zodiacForYear(chineseRelatedYear(date, timeZone));
  }
  function harmonyForZodiacs(natal, current) {
    let score = 68;
    if (TRINES.some((group) => group.includes(natal.animal) && group.includes(current.animal))) score = 86;
    if (natal.animal === current.animal) score = 72;
    if (OPPOSITES[natal.animal] === current.animal) score = 50;
    if (natal.element === current.element) score += 5;
    else if (CREATES[natal.element] === current.element || CREATES[current.element] === natal.element) score += 4;
    else if (CONTROLS[natal.element] === current.element || CONTROLS[current.element] === natal.element) score -= 5;
    return { score: clamp(score, 42, 94), natal, current };
  }

  // src/domain/cosmic-score.ts
  var NUMEROLOGY_SCORES = Object.freeze({
    1: 76,
    2: 69,
    3: 82,
    4: 67,
    5: 80,
    6: 77,
    7: 71,
    8: 88,
    9: 74,
    11: 90,
    22: 92,
    33: 94
  });
  var COSMIC_SCORE_WEIGHTS = Object.freeze({ numerology: 0.65, chineseZodiac: 0.35 });
  function clampScore(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }
  function numerologyScore(personalDay) {
    return NUMEROLOGY_SCORES[personalDay] ?? 72;
  }
  function cosmicScore(numerology, chineseZodiac2) {
    const weighted = numerology * COSMIC_SCORE_WEIGHTS.numerology + chineseZodiac2 * COSMIC_SCORE_WEIGHTS.chineseZodiac;
    return Math.round(weighted);
  }
  function taskAlignmentScore(baseScore, categoryMatchesDailyTheme, priority) {
    const themeBonus = categoryMatchesDailyTheme ? 8 : 0;
    const priorityBonus = priority.toLowerCase() === "high" ? 1 : 0;
    return clampScore(baseScore + themeBonus + priorityBonus, 30, 98);
  }

  // src/domain/guidance-preferences.ts
  var GUIDANCE_FOCUS_AREAS = Object.freeze([
    "work",
    "relationships",
    "money",
    "wellbeing",
    "growth"
  ]);
  var GUIDANCE_STYLES = Object.freeze([
    "practical",
    "balanced",
    "reflective"
  ]);
  var FOCUS_SET = new Set(GUIDANCE_FOCUS_AREAS);
  var STYLE_SET = new Set(GUIDANCE_STYLES);
  function normalizeFocusAreas(value) {
    if (!Array.isArray(value)) return [];
    const unique = /* @__PURE__ */ new Set();
    for (const item of value) {
      const candidate = String(item);
      if (!FOCUS_SET.has(candidate)) continue;
      unique.add(candidate);
      if (unique.size === 3) break;
    }
    return [...unique];
  }
  function normalizeGuidanceStyle(value) {
    const candidate = String(value ?? "");
    return STYLE_SET.has(candidate) ? candidate : "balanced";
  }

  // src/domain/planner-time.ts
  function localIsoDate(date = /* @__PURE__ */ new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function parseLocalCivilDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error("Expected date in YYYY-MM-DD format");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
      throw new Error("Invalid civil date");
    }
    return date;
  }
  function addLocalDays(date, days) {
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
  function durationMinutes(item) {
    if (item.all_day) return 0;
    const start = new Date(item.starts_at).getTime();
    const end = new Date(item.ends_at ?? "").getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.round((end - start) / 6e4);
  }
  function clockMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value)) return null;
    const [hoursText, minutesText] = value.split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  function overnightAwareDuration(start, end) {
    const startMinutes = clockMinutes(start);
    const endMinutes = clockMinutes(end);
    if (startMinutes === null || endMinutes === null) return null;
    let duration = endMinutes - startMinutes;
    if (duration <= 0) duration += 1440;
    return duration;
  }

  // src/runtime/compat.ts
  function parseDate(value) {
    try {
      return parseLocalCivilDate(value);
    } catch {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day, 12);
    }
  }
  function personalNumbers2(birth, date) {
    const normalizedBirth = parseDate(birth);
    const numbers = personalNumbers(localIsoDate(normalizedBirth), {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    });
    return { personalYear: numbers.personalYear, personalMonth: numbers.personalMonth, personalDay: numbers.personalDay };
  }
  function chinese(date) {
    try {
      return chineseZodiac(date);
    } catch (error) {
      if (error instanceof Error && error.message === "Chinese calendar related year unavailable") {
        return zodiacForYear(date.getFullYear());
      }
      throw error;
    }
  }
  function durationMinutes2(item) {
    const start = new Date(item.starts_at).getTime();
    const end = new Date(item.ends_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
    return Math.max(1, durationMinutes({ starts_at: item.starts_at, ends_at: new Date(end).toISOString(), all_day: false }));
  }
  function clockMinutes2(value) {
    const minutes = clockMinutes(value);
    if (minutes !== null) return minutes;
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, remainder] = value.split(":").map(Number);
    return hours * 60 + remainder;
  }
  function overnightDuration(start, end) {
    const duration = overnightAwareDuration(start, end);
    if (duration !== null) return duration;
    const first = clockMinutes2(start), last = clockMinutes2(end);
    if (first === null || last === null) return null;
    const delta = last - first;
    return delta <= 0 ? delta + 1440 : delta;
  }
  var adapters = Object.freeze({
    numerology: Object.freeze({ reduce: reduceNumber, lifePath, personalNumbers: personalNumbers2 }),
    chineseZodiac: Object.freeze({
      chinese,
      zodiacHarmony: (birth, date) => harmonyForZodiacs(chinese(parseDate(birth)), chinese(date))
    }),
    cosmicScore: Object.freeze({
      numerologyScore,
      cosmicScore,
      taskAlignmentScore
    }),
    guidance: Object.freeze({
      cleanFocus: normalizeFocusAreas,
      cleanStyle: (value) => normalizeGuidanceStyle(typeof value === "string" ? value : void 0)
    }),
    plannerTime: Object.freeze({
      isoDate: localIsoDate,
      parseDate,
      addDays: addLocalDays,
      durationMinutes: durationMinutes2,
      clockMinutes: clockMinutes2,
      overnightDuration
    })
  });

  // src/runtime/controller.ts
  var DOMAINS = ["numerology", "chineseZodiac", "cosmicScore", "guidance", "plannerTime"];
  function readModes(config) {
    return Object.freeze(Object.fromEntries(DOMAINS.map((domain) => {
      const value = config[domain];
      return [domain, value === "typed" || value === "shadow" ? value : "legacy"];
    })));
  }
  function equalResults(left, right) {
    if (Object.is(left, right)) return true;
    if (left instanceof Date || right instanceof Date) {
      return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
    }
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const a = Object.keys(left), b = Object.keys(right);
    if (a.length !== b.length) return false;
    return a.every((key) => Object.hasOwn(right, key) && equalResults(
      left[key],
      right[key]
    ));
  }
  function createRuntime(operations, modes) {
    const counters = /* @__PURE__ */ new Map();
    for (const domain of DOMAINS) for (const key of Object.keys(operations[domain])) {
      counters.set(`${domain}.${key}`, { legacy: 0, typed: 0, shadow: 0, mismatches: 0, errors: 0, fallback: 0, tripped: false });
    }
    function call(domain, key, legacy, args) {
      const count = counters.get(`${domain}.${key}`);
      const operation = operations[domain]?.[key];
      if (!count || typeof operation !== "function") return legacy();
      const mode = modes[domain];
      if (mode === "legacy") {
        count.legacy++;
        return legacy();
      }
      if (count.tripped) {
        count.fallback++;
        return legacy();
      }
      if (mode === "shadow") {
        const reference = legacy();
        count.shadow++;
        try {
          if (!equalResults(reference, operation(...args))) {
            count.mismatches++;
            count.tripped = true;
          }
        } catch {
          count.errors++;
          count.tripped = true;
        }
        return reference;
      }
      try {
        const result = operation(...args);
        count.typed++;
        return result;
      } catch {
        count.errors++;
        count.fallback++;
        count.tripped = true;
        return legacy();
      }
    }
    function status() {
      return { version: "alpha3.5", modes: { ...modes }, operations: Object.fromEntries(
        [...counters].map(([key, value]) => [key, { ...value }])
      ) };
    }
    return Object.freeze({ call, status });
  }

  // src/runtime/browser.ts
  var script = document.currentScript;
  window.CosmicRuntime = createRuntime(adapters, readModes(script?.dataset ?? {}));
})();
