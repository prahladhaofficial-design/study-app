# Studyapp (working name)

A paid focus timer and study toolkit for students, built once and shipped to
the web, Windows, macOS, Linux, Android and iOS.

## Stack

- React + TypeScript + Vite, styled with Tailwind CSS
- Dexie (IndexedDB) for local-first data, so the timer works offline
- Supabase for accounts, the database and sync
- Coming next: Tauri (desktop), Capacitor (mobile), Dodo Payments (web and desktop billing), RevenueCat (store billing)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # production build in dist/
```

Without Supabase keys the app runs in **preview mode**: no login, a pretend
trial, and data kept in the browser. See [docs/SETUP.md](docs/SETUP.md) to
connect real accounts.

## Where things live

| Path | What it is |
|---|---|
| `src/config/brand.ts` | App name, tagline, support email, trial length. Rename the app here |
| `src/config/pricing.ts` | Plan names and prices |
| `src/lib/timer.ts` | Timer engine, based on timestamps so it never drifts |
| `src/lib/access.ts` | Who can use the app: trial, subscription or lifetime |
| `src/lib/heatmap.ts` | Heatmap grid and streak maths |
| `src/lib/db.ts` | Local database |
| `src/components/nav.ts` | Sidebar sections and the build day each one ships |
| `supabase/migrations/` | Database schema with row-level security |
