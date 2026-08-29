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

### Multi-day planner
- Planner modal captures an explicit date and time instead of forcing every new plan onto today
- Live signed-in planner initially loads 31 days of history and 365 days ahead
- Additional calendar months are fetched lazily when needed
- Future plans persist through Supabase under existing user-scoped RLS
- Demo future plans persist locally for review without an account
- Cosmic Planner tasks can be edited for title, date, time, category and priority
- Existing task duration is preserved when a task is rescheduled
- Complete/reopen/delete behavior remains supported
- Imported Google Calendar events are displayed as read-only and must be changed at the source

### Calendar and weekly workload
- Month cells display the number of plans scheduled for each day
- Selecting a day shows its actual planner items beside the reflective score
- New plans can be created directly for the selected calendar day
- Selected-day plans support edit/complete/delete for Cosmic Planner-owned tasks
- Weekly workload view shows Monday–Sunday task counts, planned hours and completion progress
- Week-day selection updates the main calendar/day detail context
- Google Calendar refresh preserves the currently loaded multi-day planner range instead of collapsing state back to today

### Existing privacy and safety foundation retained
- Palm upload does not imply AI processing consent
- Per-image append-only Palmistry AI consent grant/revoke history with 1/7/30-day retention selection
- Palmistry AI model processing remains disabled
- Privacy-safe diagnostics remain off by default and explicitly opt-in
- Background push dispatcher remains fail-closed until private VAPID/dispatch configuration and explicit enablement
- Accessibility focus/reduced-motion/contrast safeguards remain active
- User data export and irreversible account deletion remain available

## Alpha 2.8 E2E quality gate
GitHub Actions uses GitHub OIDC rather than stored test credentials. The trusted `staging` pull-request workflow creates two short-lived confirmed Supabase users with generated masked passwords, executes browser/live-data QA, removes private Storage objects first, deletes the auth identities, then sweeps orphan palm objects.

**Verified implementation gate: 16/16 Playwright tests passed in 37.1 seconds.**

Alpha 2.8 adds explicit coverage for:
- future-date creation in demo mode
- future plan visibility/counts in the month calendar
- selected-day plan rendering
- task editing and rescheduling
- weekly workload count/hour calculations
- local persistence across demo reload
- real signed-in future plan creation through Supabase
- database date persistence
- edit persistence through Supabase
- browser reload persistence for future plans
- UI deletion followed by database deletion verification

The full suite also continues to cover desktop/mobile core behavior, authentication/password rules, birth timezone/coordinates, astrology, Google Calendar safety boundaries, notification/Web Push foundations, cross-user RLS isolation, private palm storage/consent, diagnostics opt-in/out, account export/deletion, accessibility/performance budgets, and push-dispatch fail-closed behavior.

Post-run cleanup verification:
- disposable E2E auth users: **0**
- orphan `palm-uploads` objects: **0**

## Security state
- Exposed user-owned data uses RLS
- Palm images are private per-user Storage objects
- Palm consent and diagnostic operations remain subject to RLS
- Push delivery-attempt records remain server-only
- Calendar OAuth state/token data remains server-only
- GitHub E2E provisioning trusts repository/workflow OIDC claims instead of committed credentials
- PostHog remains off and Stripe remains untouched
- Latest Supabase security advisor has only the existing leaked-password-protection warning on the current plan; Alpha 2.8 introduced no new advisor findings

## Remaining production blockers
1. Owner quality review and explicit production approval
2. Google OAuth credentials and live Google Calendar acceptance test
3. Private VAPID/dispatch secrets, scheduler activation and real closed-app push delivery test
4. Palmistry AI model/provider selection and processing/privacy review before model activation
5. Formal diagnostics/analytics privacy policy before broader telemetry
6. Stripe **test-mode only** billing after product-quality review
7. Legal/privacy copy and final data-rights review
8. Broader physical-device/cross-browser accessibility and performance release pass
9. Final commercial architecture/release review before store packaging

**This checkpoint is staging-only. Passing QA is not authorization to merge or deploy production.**

Production remains intentionally locked. Do not merge `staging` into `main` until the owner explicitly approves promotion.