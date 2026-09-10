# Deployment Workflow

1. Build changes on `staging`.
2. Run local/static validation and connected staging tests.
3. Deploy only as a Vercel preview.
4. Review UX, security, persistence, calculations and integrations.
5. Record defects and fix them on `staging`.
6. Obtain explicit owner approval.
7. Merge reviewed release to `main`.
8. Promote the approved preview to production.
9. Run post-deploy smoke tests and monitor errors.

Production deployment is intentionally disabled as a process decision until approval.
