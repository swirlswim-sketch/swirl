# Swirl

Virtual route-tracking fitness app. Pick a real-world route, log your swims, and watch your cumulative distance move you along a live map.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (auth, Postgres, Row Level Security)
- Mapbox GL JS
- PWA via `next-pwa` (wired up in Phase 7)
- Vercel

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in real values:

   ```bash
   cp .env.local.example .env.local
   ```

2. Create a Supabase project, then run the schema against it (SQL editor, or `supabase db push` with the CLI):

   ```
   supabase/migrations/0001_initial_schema.sql
   supabase/migrations/0002_rls_policies.sql
   supabase/seed/seed.sql
   ```

3. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
/app            Routes (App Router)
  /auth         Login, signup, onboarding
  /dashboard    Core loop: map + progress
  /routes       Route browser
  /log          Log a swim (bottom sheet)
  /profile      Profile, badges, settings
  /leaderboard  Global / friends leaderboards
  /api          Route handlers

/components
  /map          Mapbox route, checkpoints, user pin
  /activity     Log sheet, activity card, streak badge
  /ui           Design-system primitives
  /layout       Sidebar, bottom nav, header

/lib            Supabase client, Mapbox helpers, XP, badges, premium, units
/types          Shared TypeScript types (mirrors the DB schema)
/supabase       SQL migrations + seed data
```

Most page and component files are currently placeholders — they're built out phase by phase per the project plan. Design tokens (colors, type scale, radii, motion durations) are wired up in `app/globals.css` and `tailwind.config.ts`.
