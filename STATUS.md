# Cosmic Planner Status — Alpha 2.6 Staging

## Current quality gate
- Branch: `staging`
- Review PR: draft, unmerged, production promotion prohibited until owner approval
- Vercel: staging preview deployments active; production untouched
- Supabase: connected schema, RLS, Edge Functions and private storage active
- Stripe: untouched
- PostHog: analytics collection intentionally off

## Connected core
- Email/password authentication and recovery
- Strong 16+ character mixed-character password policy
- Birth-profile onboarding with explicit birth timezone and validated coordinates
- User-scoped planner persistence
- User-scoped diary persistence
- Deterministic Numerology
- Chinese Zodiac with Lunar New Year boundaries
- Explainable Cosmic Score v1 and persisted daily insights
- Responsive desktop/mobile PWA

## Alpha 2.6 implemented
- Real authenticated tropical planetary positions via Astronomy Engine 2.1.19
- Tropical Ascendant from local apparent sidereal time, birth latitude and birth longitude
- Equal House v1: House 1 begins at the Ascendant and all subsequent cusps are exactly 30° apart
- Explicit UI disclosure that Equal House is used and Placidus/Whole Sign/Koch are not calculated
- Synthetic Greenwich regression vector independently cross-checked against Swiss Ephemeris Equal House output
- Foreground browser reminders
- Web Push service-worker receiver and RLS-protected subscription model; sending remains locked pending secure VAPID key configuration
- Secure read-only Google Calendar OAuth/sync backend and UI; activation remains locked pending Google OAuth credentials
- Private palm-image upload/delete foundation; AI processing remains disabled
- User JSON data export
- Permanent account deletion with typed confirmation and private-file cleanup

## Signed-in E2E quality gate
GitHub Actions now uses GitHub OIDC rather than a stored test credential. The trusted `staging` pull-request workflow creates two short-lived confirmed Supabase users with generated masked passwords, runs the live browser suite, then removes test data and accounts.

The signed-in suite exercises:
- onboarding persistence with timezone and coordinate validation
- planner persistence across reloads
- diary persistence
- real authenticated Astrology Edge Function output
- deterministic Ascendant / 12 Equal House cusps
- cross-user planner and diary RLS isolation
- private palm Storage upload and delete
- account JSON export and sensitive-field exclusion
- permanent account deletion through the real UI
- storage-first E2E cleanup and orphan-private-object sweeping

Disposable account cleanup is an enforced CI step. Private Storage objects are removed before auth deletion; cleanup failure fails the quality gate instead of being silently ignored.

## Security state
- User-owned exposed tables use RLS
- Palm images are private per-user storage objects
- Calendar OAuth state/token data is server-only
- Server admin operations use server-only credentials
- GitHub E2E provisioning trusts repository/workflow OIDC claims instead of committed credentials
- Orphan palm-object count is checked during Alpha 2.6 validation and must return to zero after test cleanup
- Latest Supabase advisor has one known warning: leaked-password protection is unavailable on the current Free plan

## Remaining production blockers
1. Owner quality review and explicit approval
2. Google OAuth credentials and live Google Calendar acceptance test
3. Secure VAPID key storage, push sender/scheduler and real closed-app notification test
4. Explicit opt-in Palmistry AI processing, retention and privacy review
5. Error monitoring and consented analytics policy
6. Stripe **test-mode only** billing after product-quality review
7. Legal/privacy copy, account data-rights review and store packaging
8. Final cross-browser/device/accessibility/performance release pass

Production remains intentionally locked. Do not merge `staging` into `main` until the owner explicitly approves promotion.