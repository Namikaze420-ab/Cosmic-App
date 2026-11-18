# Cosmic Planner

Cosmic Planner brings daily plans, a private journal, and optional symbolic guidance into one installable web app. Open the demo to try it on this device or sign in to save data to an account.

## Run the app

Use Node.js 22 and run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. For the same static release that staging serves:

```sh
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory out
```

## Validate staging

```sh
npm run test:parity
npx playwright install --with-deps chromium firefox webkit
npm run test:qa
npm run test:release
```

Browser commands build and serve the exported site. Signed-in acceptance runs in GitHub Actions using the repository's disposable test accounts. The runtime tests use the frozen Alpha 3.4 reference for comparison.

## Release

The staging pull request provides a review preview. Owner approval is required to merge to main, release to production, activate live Stripe, or enable PostHog. See [STATUS.md](STATUS.md) for outstanding acceptance work and integration configuration.
