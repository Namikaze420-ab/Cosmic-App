export const DOMAINS = ['numerology','chineseZodiac','cosmicScore','guidance','plannerTime'] as const;
export type Domain = typeof DOMAINS[number];
export type Mode = 'legacy' | 'shadow' | 'typed';
export type Modes = Readonly<Record<Domain, Mode>>;

// Classic scripts enter through this boundary. Each adapter itself is fully
// typed; the controller forwards arguments without coercing application data.
type Operation = (...args: never[]) => unknown;
type Operations = Readonly<Record<Domain, Readonly<Record<string, Operation>>>>;
type Counts = { legacy:number; typed:number; shadow:number; mismatches:number; errors:number; fallback:number; tripped:boolean };

export function readModes(config: Partial<Record<Domain, unknown>>): Modes {
  return Object.freeze(Object.fromEntries(DOMAINS.map(domain => {
    const value = config[domain];
    return [domain, value === 'typed' || value === 'shadow' ? value : 'legacy'];
  })) as Record<Domain, Mode>);
}

export function equalResults(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left), b = Object.keys(right);
  if (a.length !== b.length) return false;
  return a.every(key => Object.hasOwn(right, key) && equalResults(
    (left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key],
  ));
}

export function createRuntime(operations: Operations, modes: Modes) {
  const counters = new Map<string, Counts>();
  for (const domain of DOMAINS) for (const key of Object.keys(operations[domain])) {
    counters.set(`${domain}.${key}`, { legacy:0, typed:0, shadow:0, mismatches:0, errors:0, fallback:0, tripped:false });
  }

  function call(domain: Domain, key: string, legacy: () => unknown, args: readonly unknown[]): unknown {
    const count = counters.get(`${domain}.${key}`);
    const operation = operations[domain]?.[key];
    if (!count || typeof operation !== 'function') return legacy();
    const mode = modes[domain];
    if (mode === 'legacy') { count.legacy++; return legacy(); }
    if (count.tripped) { count.fallback++; return legacy(); }
    if (mode === 'shadow') {
      const reference = legacy();
      count.shadow++;
      try {
        if (!equalResults(reference, operation(...args as never[]))) {
          count.mismatches++;
          count.tripped = true;
        }
      } catch { count.errors++; count.tripped = true; }
      return reference;
    }
    try { const result = operation(...args as never[]); count.typed++; return result; }
    catch { count.errors++; count.fallback++; count.tripped = true; return legacy(); }
  }

  // Counts and operation names only. No inputs, dates, preferences, journal
  // content, exception text, network requests or persistence in diagnostics.
  function status() {
    return { version:'alpha3.5', modes:{ ...modes }, operations:Object.fromEntries(
      [...counters].map(([key, value]) => [key, { ...value }]),
    ) };
  }
  return Object.freeze({ call, status });
}
