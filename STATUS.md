# Cosmic Planner Status — Alpha 2.5 Staging

## Current quality gate
- Branch: `staging`
- Review PR: draft, unmerged, production promotion prohibited until owner approval
- Vercel: staging preview deployments active; production untouched
- Supabase: connected schema, RLS and private storage active
- Stripe: untouched
- PostHog: analytics collection intentionally off

## Connected core
- Email/password authentication and recovery
- Strong 16+ character mixed-character password policy
- Birth-profile onboarding
- Planner persistence
- Diary persistence
- Deterministic Numerology
- Chinese Zodiac with Lunar New Year boundaries
- Explainable Cosmic Score v1 and persisted daily insights
- Responsive desktop/mobile PWA

## Alpha 2 implemented
- Real authenticated tropical planetary positions via Astronomy Engine 2.1.19
- Explicit birth timezone and validated birth latitude/longitude storage
- Foreground browser reminders
- Web Push service-worker receiver and RLS-protected subscription model; sending is locked pending secure VAPID key configuration
- Secure read-only Google Calendar OAuth/sync backend and UI; activation locked pending Google OAuth credentials
- Private palm-image upload/delete foundation; AI processing remains disabled
- User JSON data export
- Permanent account deletion with typed confirmation and private-file cleanup

## Security state
- User-owned exposed tables use RLS
- Palm images are private per-user storage objects
- Calendar OAuth state/token data is server-only
- Server admin operations use server-only credentials
- Latest Supabase advisor has one known warning: leaked-password protection is unavailable on the current Free plan

## QA
- Alpha 2.4 checkpoint passed 10/10 Playwright tests
- Alpha 2.5 adds regression coverage for birth-coordinate validation and the background-push foundation
- Staging CI cancels stale runs and only the current review state counts

## Production blockers
1. Owner quality approval
2. Google OAuth credentials and live calendar acceptance test
3. Secure VAPID key storage and real closed-app push test
4. Dedicated validated Ascendant/house calculation engine
5. Explicit opt-in Palmistry AI privacy/processing flow
6. Signed-in E2E coverage for destructive/sensitive flows
7. Error monitoring and consented analytics policy
8. Stripe test-mode billing only after product-quality review
9. Legal/privacy copy and store packaging

Production remains intentionally locked.