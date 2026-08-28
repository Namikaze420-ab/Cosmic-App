# Cosmic App

Professional staging-first build of Cosmic Planner: a daily planner and digital diary with transparent numerology, astrology, Chinese zodiac and optional palmistry insights.

## Branch policy

- `main` — approved baseline only.
- `staging` — review and QA builds.
- Production deployment must not be promoted before explicit quality approval.

## Current staging build

The current review build is a dependency-free responsive PWA. It intentionally uses local demo data while production integrations are completed and tested.

Included in staging:
- Today dashboard and timeline
- Quick-add planner interaction
- Monthly calendar with alignment indicators
- Diary with local autosave and mood tracking
- Transparent insight breakdowns
- Privacy/settings screens
- Responsive desktop/mobile navigation
- PWA manifest + offline service worker

## Production architecture prepared

- Next.js App Router + TypeScript
- Supabase SSR/Auth + Postgres + Row Level Security + private Storage
- Vercel preview -> review gate -> production promotion
- Stripe sandbox before any live billing
- PostHog only after telemetry/privacy review

## Deployment rule

Production remains locked until the staging build passes UX, security, accessibility, persistence, calculation-engine and integration QA.
