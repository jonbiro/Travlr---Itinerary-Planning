# Travlr Web

The current Travlr web app is a Next.js application in this directory. The repository root also contains the older Rails application; use the commands below from `travlr-web` for the Next.js app.

## Prerequisites

- Node.js 22.12 or newer (Node.js 20.19+ and 24+ are also supported by the Prisma version in this project).
- npm 10 or newer.
- A PostgreSQL database for database-backed features.

Next.js 16 requires Node.js 20.9 or newer, while Prisma 7 has the stricter Node.js requirement above. If you use a version manager, Node.js 22.12+ is the recommended local and deployment runtime.

## Setup

From the repository root:

```bash
cd travlr-web
cp .env.example .env.local
npm ci
```

Edit `.env.local` with the values for your environment, then apply the database migrations:

```bash
npm run db:migrate
```

Never commit `.env.local` or any file containing credentials.

The initial Prisma migration is checked in. Apply all pending migrations with:

```bash
npm run db:migrate
```

For disposable local schema iteration, `npm run db:push` is also available. Production environments should use `npm run db:migrate` so schema changes remain versioned and repeatable.

If an existing database was previously created with `prisma db push`, verify that its schema matches this migration before baselining it with `npx prisma migrate resolve --applied 20260830203000_init`. New databases do not need this one-time step.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for database features | PostgreSQL connection string used by Prisma. |
| `OPENAI_API_KEY` | Yes for AI routes | OpenAI credential used by itinerary generation, packing lists, and chat. |
| `OPENAI_MODEL` | Optional | OpenAI model override. Defaults to `gpt-5.6-luna`. |
| `TRAVLR_DEMO_MODE` | Optional for local development | Set `true` to use the seeded demo user locally, or `false` to exercise the authenticated path. It is ignored in production, where API routes always require a NextAuth session. When unset, local runs use demo mode only if Google auth is not configured. |
| `NEXTAUTH_SECRET` | Yes in deployed auth environments | Secret used by NextAuth to sign sessions. |
| `NEXTAUTH_URL` | Yes in deployed auth environments | Canonical app URL, for example `http://localhost:3000` locally. |
| `GOOGLE_CLIENT_ID` | Yes for Google sign-in | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes for Google sign-in | Google OAuth client secret. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Enables the interactive map. The dashboard shows a helpful fallback when it is unset. |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Required with Maps in production | Project-owned Google Maps ID used by advanced markers. Local development falls back to Google's demo map ID. |
| `OPENWEATHERMAP_API_KEY` | Optional | Enables live weather. When it is unset, weather surfaces a configuration message instead of fabricated data. |

The checked-in [`.env.example`](.env.example) contains variable names only. Keep actual values in `.env.local`, your deployment provider's encrypted environment settings, or your CI secret store.

When Google/NextAuth is configured, sign in through `/api/auth/signin` before using database-backed or AI routes. Requests without a session receive `401 Unauthorized`. Demo mode is intended only for a fresh local checkout; it is disabled automatically when `NODE_ENV=production`.

Weather forecasts use OpenWeatherMap's geocoding and forecast APIs. If the key is missing, the weather endpoints return `503 Service Unavailable`; unknown locations return `404`, and provider failures return `502`. The UI shows those messages and does not substitute mock weather.

The paid/proxied endpoints use a best-effort, process-local per-user rate limiter: chat allows 30 requests per 10 minutes, itinerary generation 5, packing lists 20, and weather 60. Exceeded limits return `429` with a `Retry-After` header. This limiter is intentionally dependency-free and bounded, so distributed or multi-instance deployments must replace `src/lib/rate-limit.ts` with a shared provider (such as Redis or the hosting platform's rate-limit service) to enforce limits across instances.

Itinerary generation declares a 60-second function duration, while chat and packing-list generation declare 30 seconds. Configure the deployment plan to honor those limits. Weather provider requests abort after 10 seconds so an upstream outage does not hold a function open indefinitely.

## Development

```bash
npm run dev
```

Open <http://localhost:3000>. The main implemented pages are `/`, `/dashboard`, `/explore`, `/trips`, `/trips/[id]`, and `/stats`.

Useful checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

Run `npx prisma generate` after a clean install and whenever the Prisma schema changes. It is required before TypeScript checks or a production build because the generated Prisma client is not stored in the repository.

To serve a production build locally:

```bash
npm run start
```

## Deployment

For Vercel or another Next.js host:

1. Set the project root to `travlr-web`.
2. Use Node.js 22.12+.
3. Set the required environment variables in the host's encrypted settings.
4. Use `npm ci` for installation and `npm run build` for the build command.
5. Run `npm run db:migrate` against the target PostgreSQL database before exercising database-backed routes.

The build and CI checks only need a syntactically valid `DATABASE_URL`; they do not need a live database connection. Runtime API requests do require a reachable PostgreSQL database.

## CI

The workflow at [`.github/workflows/travlr-web.yml`](../.github/workflows/travlr-web.yml) runs install, Prisma client generation, lint, tests, TypeScript checking, and the production build for changes to this app. CI supplies non-secret placeholders for build-time configuration; it does not call the OpenAI, Google, or weather APIs.
