# Cosmic Planner Status — Alpha 2.9 Staging

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

## Alpha 2.9 implemented
- Explicit task start and end times with visible duration
- Start-time changes preserve the current duration unless the user deliberately edits the end time
- Intentional overnight plans remain supported
- All-day plans use the existing first-class planner field and do not inflate timed workload
- Per-task reminder choices: at time, 5 minutes, 15 minutes, 30 minutes, 1 hour and 1 day before
- Bounded recurring plans: daily, weekdays, weekly and monthly
- Recurring plans require an end date and are capped at 180 materialized occurrences for safety
- Recurrence metadata is persisted under the existing planner RLS boundary
- Existing one-off plans can be converted into recurring series
- Recurring edits support this occurrence only or this-and-future scope
- This-and-future replacement inserts the new series before deleting the old future segment and attempts rollback if deletion fails
- Recurring plans support a dedicated Delete future action
- Today / Week planning switch on Home
- Weekly command view with daily plans, timed load and heavy-day summary
- Workload states: Open, Balanced, Heavy and Overloaded
- Imported Google Calendar time contributes to workload calculations while imported events remain read-only
- Planner modal is a constrained, scrollable sheet with sticky actions and mobile safe-area handling
- Alpha 2.8 multi-day calendar/date navigation, lazy month loading and signed-in persistence remain intact

## Privacy and safety foundation retained
- Palm upload does not imply AI consent
- Versioned per-image palm AI consent grant/revoke history with 1/7/30-day retention selection
- Palmistry AI model processing remains disabled
- Privacy-safe diagnostics are off by default and opt-in
- Background push dispatcher remains fail-closed until private configuration and explicit enablement
- Accessibility focus/reduced-motion/contrast safeguards remain active
- User JSON export and irreversible account deletion remain available

## Alpha 2.9 E2E quality gate
GitHub Actions uses GitHub OIDC instead of stored test credentials. The staging pull-request workflow creates two short-lived confirmed Supabase users with masked generated passwords, executes browser/live-data QA, deletes the auth identities, and sweeps orphan private palm objects.

**Implementation gate: 20/20 Playwright tests passed in 44.4 seconds.**

Alpha 2.9-specific coverage includes:
- duration and end-time editing
- duration preservation when only start time changes
- all-day plans
- reminder selection
- bounded recurring-plan generation and Delete future behavior
- one-off to recurring conversion
- real signed-in recurrence metadata, duration and reminder persistence in Supabase
- this-and-future recurring edits and database verification
- workload warnings and Today/Week command view
- imported Google Calendar time contributing to workload without becoming editable

The full suite also retains desktop/mobile core flows, authentication/password policy, Alpha 2.8 future-plan create/edit/reload/delete persistence, astrology, cross-user RLS isolation, palm privacy/consent, diagnostics, export/delete, accessibility/performance budgets and push-dispatch fail-closed checks.

Post-run implementation-gate verification:
- disposable E2E auth users: **0**
- orphan `palm-uploads` objects: **0**
- Vercel implementation deployment: **READY**, errors-only build log contains no build error
- the temporary duplicate planner date index introduced during Alpha 2.9 development was removed; the recurrence-group index remains

This documentation commit is subject to the same full staging CI gate before Alpha 2.9 is considered the frozen review checkpoint.

## Security state
- Exposed user-owned data uses RLS
- Recurrence metadata remains on the user-owned `planner_items` table under existing RLS
- Palm images are private per-user Storage objects
- Calendar OAuth state/token data remains server-only
- Push delivery-attempt records remain server-only
- GitHub E2E provisioning trusts repository/workflow OIDC claims instead of committed credentials
- PostHog remains off and Stripe remains untouched
- Latest Supabase security advisor has only the existing leaked-password-protection warning; Alpha 2.9 introduced no new security-advisor finding

## Remaining production blockers
1. Owner quality review and explicit production approval
2. Google OAuth credentials and live Google Calendar acceptance test
3. Private VAPID/dispatch secrets, scheduler activation and real closed-app push delivery test
4. Broader physical-device/cross-browser accessibility and performance release pass
5. Formal diagnostics/analytics privacy policy before broader telemetry
6. Palmistry AI provider/model selection and processing/privacy review before activation
7. Stripe test-mode billing only after product-quality review
8. Legal/privacy copy and final data-rights review
9. Final commercial architecture/release review before store packaging

**This checkpoint is staging-only. Passing QA is not authorization to merge or deploy production.**

Production remains intentionally locked. Do not merge `staging` into `main` until the owner explicitly approves promotion.