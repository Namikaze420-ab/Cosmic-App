# Security Policy

Cosmic Planner is private-by-default.

- Never commit secrets, service-role keys, OAuth refresh tokens, Stripe secret keys, or AI provider credentials.
- Client code may use only publishable/public keys intended for browser use.
- Personal planner, diary, birth-profile, palm-image and insight records must remain user-scoped through Supabase Row Level Security.
- Palm images are opt-in and stored in a private bucket; production must provide deletion controls.
- Billing webhooks must be authenticated and handled server-side.
- Production deployment requires completion of the repository quality gate.
