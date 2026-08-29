# Cosmic Planner Status — Alpha 2.8 Staging

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
- User-scoped multi-day planner persistence
- User-scoped diary persistence
- Deterministic Numerology
- Chinese Zodiac with Lunar New Year boundaries
- Explainable Cosmic Score v1 and persisted daily insights
- Responsive desktop/mobile PWA
- Authenticated tropical planetary positions, Ascendant and Equal House v1
- Private palm-image upload/delete foundation
- User JSON export and permanent account deletion

## Alpha 2.8 implemented
- Explicit planner date and time
- Live planner initial range: 31 days past / 365 days future
- Lazy loading for additional calendar months
- Future plan persistence in Supabase and local demo mode
- Edit/reschedule title, date, time, category and priority while preserving duration
- Complete/reopen/delete for Cosmic Planner tasks
- Read-only treatment for imported Google Calendar events
- Month plan-count badges
- Selected-date task list and direct Add action
- Monday–Sunday weekly workload with plan count, hours and completion progress
- Google Calendar refresh preserves the loaded multi-day range

## Privacy and safety foundation retained
- Palm upload does not imply AI consent
- Versioned per-image palm AI consent grant/revoke history with 1/7/30-day retention selection
- Palmistry AI model processing remains disabled
- Privacy-safe diagnostics are off by default and opt-in
- Background push dispatcher remains fail-closed until private configuration and explicit enablement
- Accessibility focus/reduced-motion/contrast safeguards remain active
- User JSON export and irreversible account deletion remain available

## Alpha 2.8 E2E quality gate
GitHub Actions uses GitHub OIDC instead of stored test credentials. The staging pull-request workflow creates two short-lived confirmed Supabase users with masked generated passwords, executes browser/live-data QA, removes private Storage objects first, deletes the auth identities, then sweeps orphan palm objects.

**Implementation gate: 16/16 Playwright tests passed in 37.1 seconds.**

Alpha 2.8 coverage includes future-date creation, month plan counts, selected-day rendering, task editing/rescheduling, weekly workload calculations, demo reload persistence, real signed-in Supabase future-plan create/edit/reload/delete persistence, and database deletion verification. The full suite also retains desktop/mobile, authentication, astrology, RLS, palm/privacy, diagnostics, export/deletion, accessibility/performance and push fail-closed checks.

Post-run implementation-gate cleanup:
- disposable E2E auth users: **0**
- orphan `palm-uploads` objects: **0**

The exact documentation checkpoint commit that contains this file is subject to the same staging CI gate before the release checkpoint is considered frozen.

## Security state
- Exposed user-owned data uses RLS
- Palm images are private per-user Storage objects
- Calendar OAuth state/token data remains server-only
- Push delivery-attempt records remain server-only
- GitHub E2E provisioning trusts repository/workflow OIDC claims instead of committed credentials
- PostHog remains off and Stripe remains untouched
- Latest Supabase security advisor has only the existing leaked-password-protection warning on the current plan; Alpha 2.8 introduced no new advisor findings

## Remaining production blockers
1. Owner quality review and explicit production approval
2. Google OAuth credentials and live Google Calendar acceptance test
3. Private VAPID/dispatch secrets, scheduler activation and real closed-app push delivery test
4. Palmistry AI provider/model selection and processing/privacy review before activation
5. Formal diagnostics/analytics privacy policy before broader telemetry
6. Stripe test-mode billing only after product-quality review
7. Legal/privacy copy and final data-rights review
8. Broader physical-device/cross-browser accessibility and performance release pass
9. Final commercial architecture/release review before store packaging

**This checkpoint is staging-only. Passing QA is not authorization to merge or deploy production.**

Production remains intentionally locked. Do not merge `staging` into `main` until the owner explicitly approves promotion.