# Cosmic Planner Status — Alpha 2.7 Staging

## Current quality gate
- Branch: `staging`
- Review PR: draft, unmerged, production promotion prohibited until owner approval
- Vercel: staging preview deployments active; production untouched
- Supabase: connected schema, RLS, Edge Functions and private storage active
- Stripe: untouched
- PostHog: analytics collection intentionally off
- Google Calendar activation: locked pending app OAuth credentials and live acceptance testing
- Background push sending: locked pending private VAPID/dispatch secrets and explicit send enablement

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
- Authenticated tropical planetary positions, Ascendant and Equal House v1
- Private palm-image upload/delete foundation
- User JSON export and permanent account deletion

## Alpha 2.7 implemented

### Explicit Palmistry AI consent foundation
- Palm upload remains private and does **not** imply AI consent
- Per-image, append-only consent events record grant/revoke actions
- Consent is versioned as `palm-ai-consent-v1`
- User selects a maximum future-processing retention window of 1, 7 or 30 days
- Consent can be withdrawn through the UI
- Consent records are user-scoped under RLS and cascade when the palm record/account is deleted
- Palmistry AI model processing remains disabled; Alpha 2.7 records consent only and does not invoke a model

### Privacy-safe diagnostics
- Diagnostics collection is off by default
- User must explicitly opt in and may turn it off at any time
- Server-side RLS also requires current opt-in before accepting a diagnostic record
- Client uploads only a one-way SHA-256-derived fingerprint, broad error category, app section and app version
- Raw error messages, stack traces, diary content, palm images, task titles, account email and page URLs are not uploaded
- Account export includes the stored privacy-safe diagnostic records but never the raw source material

### Background push sender foundation
- Server-side `push-reminder-dispatch` Edge Function is deployed
- Delivery deduplication/audit state is server-only
- Push payload is intentionally generic and does not expose task titles/private planner content on the lock screen
- Sender fails closed unless a private dispatch token, VAPID credentials and explicit `COSMIC_PUSH_SEND_ENABLED=true` are all configured
- GitHub Actions verifies the dispatcher refuses unauthenticated/unconfigured delivery
- Real push sending remains intentionally disabled

### Accessibility and performance gate
- Visible keyboard focus treatment
- 44px minimum interactive/form control height
- Reduced-motion support
- Increased-border support for higher-contrast preference
- Automated checks for duplicate IDs, unnamed buttons and unlabelled visible controls
- Automated deterministic startup/resource budgets

## Alpha 2.7 signed-in E2E quality gate
GitHub Actions uses GitHub OIDC rather than stored test credentials. The trusted `staging` pull-request workflow creates two short-lived confirmed Supabase users with generated masked passwords, executes browser/live-data QA, removes private Storage objects first, deletes the auth identities, then sweeps orphan palm objects.

**Verified gate: 14/14 Playwright tests passed in 29.2 seconds.**

The suite covers:
- desktop and mobile core flows
- birth timezone/coordinate validation
- demo safety boundaries for Astrology, Calendar, notifications and palm data
- strong-password validation
- privacy/account-control demo boundaries
- service-worker background-push foundation
- keyboard focus, control labels/names and reduced-motion behavior
- startup/resource performance budgets
- real signed-in onboarding and persistence
- cross-user planner/diary RLS isolation
- authenticated Astrology Edge Function output and deterministic Equal House/Ascendant checks
- private palm upload/delete
- explicit palm AI-consent grant, retention selection and withdrawal
- consent cascade cleanup
- diagnostics default-off behavior, opt-in enforcement and opt-out
- privacy-safe export without raw diagnostic source text or server secrets
- permanent account deletion through the real UI
- fail-closed push-dispatch endpoint

Post-run cleanup verification:
- disposable E2E auth users: **0**
- orphan `palm-uploads` objects: **0**

## Security state
- Exposed user-owned data uses RLS
- Alpha 2.7 user-facing consent/diagnostic RPCs are SECURITY INVOKER and remain subject to RLS
- Palm images are private per-user Storage objects
- Push delivery-attempt records are server-only with authenticated deny-all RLS
- Calendar OAuth state/token data remains server-only
- Server admin operations use server-only credentials
- GitHub E2E provisioning trusts repository/workflow OIDC claims instead of committed credentials
- PostHog remains off and Stripe remains untouched
- Latest Supabase security advisor has only the existing leaked-password-protection warning on the current plan; Alpha 2.7 introduced no new advisor findings

## Remaining production blockers
1. Owner quality review and explicit approval
2. Google OAuth credentials and live Google Calendar acceptance test
3. Secure VAPID/dispatch secret storage, scheduler activation and real closed-app push delivery test
4. Palmistry AI model/provider selection plus explicit privacy/retention processing review before model activation
5. Formal error-monitoring/analytics privacy policy before any broader telemetry is enabled
6. Stripe **test-mode only** billing after product-quality review
7. Legal/privacy copy, final data-rights review and store packaging
8. Broader cross-browser/physical-device accessibility and performance release pass

Production remains intentionally locked. Do not merge `staging` into `main` until the owner explicitly approves promotion.