# Cosmic Planner Architecture

## Review stage
The Next.js App Router renders the planner shell, account entry, plan editor and privacy page as a static export. Demo data stays in the browser. Signed-in flows use Supabase.

The planner starts its existing interaction modules after hydration. The independently loadable typed calculation bundle keeps the Alpha 3.5 runtime switches and missing-bundle fallback. Both the plan editor and recurrence code share the same local-date helpers. The build packages the pinned auth client with the app and generates an offline cache from public assets in the export.

## Connected application target
- Frontend: Next.js App Router + TypeScript
- Backend: Supabase Auth, PostgreSQL, Row Level Security, private Storage, Edge Functions where appropriate
- Deployment: Vercel preview deployments before production promotion
- Calendar: Google Calendar OAuth/sync; platform calendar support evaluated separately
- Billing: Stripe test mode first; subscription entitlements persisted server-side
- Analytics: PostHog after consent/privacy review
- AI: multimodal palm-reading service only behind explicit upload consent

## Core domains
Profiles, user preferences, planner items, diary entries, insight profiles, daily insights, palm readings, calendar connections, and subscription entitlements.

## Trust boundary
Astrology/numerology/zodiac/palmistry outputs are reflective/entertainment guidance. The product must not present alignment scores as guarantees or substitute them for medical, legal, financial, or other professional advice.
