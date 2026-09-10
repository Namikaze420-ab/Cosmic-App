# Alpha 3.5 — controlled runtime cutover

Baseline: Alpha 3.4, `f34ab7d0a023c07299220fab315eb3fcdbb14004`.

The browser now calls the five typed domains through `src/runtime/compat.ts`.
The UI, authentication, database schemas, RLS, persisted data shapes and scoring
algorithm remain at their established contracts. The Next.js shell migration is
still a later milestone.

## Release lock

Staging review only. Do not merge to `main`, deploy/promote production, activate
live Stripe or enable PostHog without explicit owner approval. Passing tests is
not approval. Google Calendar, background push and palm AI activation retain
their existing configuration/approval gates.

## Runtime and rollback

`runtime-alpha35.js` is a synchronous classic bundle loaded before `app.js`.
Its source lives in `src/domain/` and `src/runtime/`; generate it with
`npm run build:runtime`. It is committed so the existing static preview/offline
app does not need a deployment build-system change. `npm run check:runtime`
fails if the committed bytes differ from the pinned build-tool output.

The bundle's script element in `index.html` sets each domain's mode:

| Attribute | Domain | Alpha 3.5 mode |
| --- | --- | --- |
| `data-planner-time` | Civil dates, day movement, clock/duration adapters | `typed` |
| `data-guidance` | Explicit priority/style normalization | `typed` |
| `data-numerology` | Reduction, Life Path, Personal Year/Month/Day | `typed` |
| `data-chinese-zodiac` | Chinese calendar year and harmony | `typed` |
| `data-cosmic-score` | Numerology score, 65/35 weighting and task alignment | `typed` |

- `legacy` returns the existing classic-script result and never invokes the typed adapter.
- `shadow` returns the legacy result and compares the typed result. A mismatch
  or typed exception trips that operation to legacy for the rest of the page.
- `typed` returns the typed result. An exception falls back to legacy and trips
  that operation for the rest of the page. It does not calculate shadow parity
  on every successful call; deterministic/browser parity tests gate this mode.
- Missing/unknown attributes select `legacy`. If the bundle is missing, the app
  continues using its legacy bodies. No query-string, storage or remote flags
  can enable a domain or alter billing/analytics controls.

Rollback one domain by changing its attribute to `legacy` on staging and
reloading the preview. Roll back the whole cutover by setting all five to
`legacy`. A source commit and the normal QA gate are required; no data rollback
or migration is involved. Existing open tabs retain their startup modes until
reload. If an asset changes, update its query version in both `index.html` and
`sw.js`, and advance the service-worker cache version.

`window.CosmicRuntime.status()` exposes in-memory counts by operation: legacy,
typed, shadow, errors, mismatches, fallback and tripped. It stores no arguments,
return values, exception messages, profile dates, preferences or journal text.
There are no telemetry requests, persistent diagnostics or PostHog calls.

## Compatibility decisions

- Personal numbers still return only the three existing public properties.
  `universalYear` remains an internal domain intermediate.
- Civil dates remain local noon, including across DST. Legacy overflow dates
  and the JavaScript 0–99 year interpretation are preserved at the adapter.
- Chinese calendar computation uses the browser's local zone, as before.
  Missing `Intl.relatedYear` retains the existing Gregorian fallback; other
  calculation errors fall back through the controller.
- The legacy planner API returns 60 minutes for missing/nonpositive durations,
  at least one minute for positive subminute intervals, and elapsed duration
  for all-day rows. Workload callers still explicitly exclude all-day rows.
  The strict domain API's zero-duration semantics are unchanged.
- Overnight clocks, even equal start/end times, retain the 24-hour rollover.
  Legacy out-of-range clock strings retain compatibility; HTML time controls
  continue to provide valid times.
- Guidance ordering and the three-priority cap are unchanged. Non-string style
  objects still normalize to `balanced` rather than gaining new coercion.

## Verification

```sh
npm ci
npm run test:parity
npx playwright install --with-deps chromium firefox webkit
npm run test:qa
npm run test:release
```

`tests/fixtures/alpha34-legacy.cjs` is a frozen executable reference extracted
from the baseline commit. Do not update it to match a new implementation.

The deterministic gate covers master numbers; five time zones; Lunar New Year,
leap-day, midnight and DST boundaries; the full sixty-year zodiac cycle;
score limits; malformed preferences; duration compatibility; isolated mode
selection; mismatch/exception fallback; generated-bundle identity; and offline
asset inclusion. The original five Alpha 3.4 reference tests also remain.

Browser QA compares full insights and task scores against that same oracle in
Chromium, Firefox and WebKit. It exercises all three modes, staged cumulative
cutover, per-domain rollback, missing-bundle fallback, recurring overnight plans,
reload persistence, and explicit guidance. Chromium additionally checks an
offline reload with the cached typed bundle. Existing signed-in Supabase QA
continues to provision and clean up disposable accounts through GitHub OIDC.

Local deterministic gate: 16/16 tests passed. Browser/release/live-data acceptance
is recorded on draft PR #1 and its commit-specific GitHub Actions checks; consult
those checks before treating any particular staging commit as the frozen checkpoint.

## Next step

After this staging checkpoint is accepted, retire legacy pure bodies one domain
at a time, retaining the frozen oracle and browser parity tests. Keep the shell
and persistence migration separate from calculation changes.
