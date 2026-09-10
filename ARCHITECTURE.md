# Cosmic Planner Architecture

## Review stage
Static responsive PWA on `staging`, using local demo data only.

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
