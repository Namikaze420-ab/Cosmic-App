# Cosmic Planner — Quality Gate

Production promotion is blocked until all required items pass.

## Stage A — Review prototype
- [x] Responsive desktop/mobile layout
- [x] Planner quick-add interaction
- [x] Calendar context view
- [x] Diary local autosave and mood input
- [x] Insight transparency / no guarantee language
- [x] PWA manifest and service worker
- [x] JavaScript syntax validation
- [x] Local HTTP asset validation

## Stage B — Connected staging
- [ ] Supabase authentication integrated in app
- [ ] Planner CRUD persists to Supabase
- [ ] Diary CRUD persists to Supabase
- [ ] Deterministic numerology engine with unit tests
- [ ] Chinese zodiac engine with unit tests
- [ ] Astrology calculation source and algorithm documented
- [ ] Palmistry opt-in upload/process/delete flow
- [ ] Google Calendar OAuth and sync
- [ ] Notification scheduling and permissions
- [ ] Account export and deletion
- [ ] Empty/loading/error/offline states
- [ ] WCAG-focused accessibility review
- [ ] Cross-browser/mobile QA
- [ ] Automated end-to-end tests

## Stage C — Commercial staging
- [ ] Stripe test-mode products and webhooks
- [ ] Premium entitlement tests
- [ ] Privacy policy / terms / disclaimers reviewed
- [ ] PostHog event taxonomy and consent model reviewed
- [ ] Error monitoring configured
- [ ] App-store metadata and privacy declarations prepared

## Release rule
Do not merge the staging release into `main` or promote a Vercel preview to production until the owner explicitly approves the quality gate.
