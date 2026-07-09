<p align="center">
  <img src="public/icons/icon-192.png" width="72" alt="Commit" />
</p>

<h1 align="center">Commit</h1>
<p align="center"><em>Every task is a commitment to your future.</em></p>

Commit is a private, single-user progress tracker. Every completed task creates visible momentum: the dashboard ring, its project, its category, its goal, your XP, your streak, and every chart update the moment you check it off.

**Stack:** React 18 + TypeScript + Vite · Tailwind CSS · Supabase (Auth + Postgres) · installable PWA with offline support · deployed on Vercel.

---

## Project structure

```
commit/
├── index.html                  # HTML shell, meta, PWA tags
├── package.json
├── vite.config.ts              # Vite + PWA manifest + service-worker config
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vercel.json                 # Vercel SPA rewrites + caching headers
├── .env.example                # Environment variable template
├── public/
│   └── icons/                  # PWA + favicon icons (192/512/maskable/apple)
├── supabase/
│   └── schema.sql              # All tables, indexes, RLS policies
└── src/
    ├── main.tsx                # Entry: mounts App, registers service worker
    ├── App.tsx                 # Auth gate + app shell + routing
    ├── assets/                 # (static assets imported by code)
    ├── styles/
    │   └── globals.css         # Design system: metallic purple, glass, motion
    ├── types/
    │   └── index.ts            # Task, Project, Goal, Category, Settings…
    ├── utils/
    │   ├── constants.ts        # Brand palette, priorities, difficulties
    │   ├── date.ts             # Local-date helpers
    │   └── xp.ts               # XP values + level curve
    ├── services/
    │   ├── supabase.ts         # Client + single-user allow-list
    │   ├── dataService.ts      # Typed CRUD, row mapping, write queue
    │   └── seed.ts             # Optional sample workspace
    ├── hooks/
    │   ├── useAuth.ts          # Google / email / magic-link auth
    │   └── useAppData.ts       # All state, derived stats, persisted actions
    ├── components/
    │   ├── ui/                 # ProgressBar, Ring, Modal, Toasts, Confetti…
    │   ├── layout/             # Sidebar, Topbar, nav model, brand mark
    │   └── tasks/              # TaskRow, TaskModal
    └── pages/
        ├── DashboardPage.tsx
        ├── TasksPage.tsx
        ├── CalendarPage.tsx
        ├── CollectionsPages.tsx   # Projects, Goals, Categories
        ├── SystemPages.tsx        # Analytics, Settings, Locked
        └── LoginPage.tsx
```

---

## 1 · Install and run locally

Requirements: **Node 18+** and npm.

```bash
git clone <your-repo-url> commit   # or unzip the project folder
cd commit
npm install
cp .env.example .env               # then fill in the three values (next section)
npm run dev                        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

---

## 2 · Set up Supabase (database + auth)

### 2.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. Pick any name (e.g. `commit`), a strong database password, and a region near you.

### 2.2 Create the tables

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. That's it — this creates `tasks`, `projects`, `goals`, `categories`, and `settings`, plus indexes and Row Level Security so each row is only visible to its owner.

### 2.3 Get your keys

**Project Settings → API**, copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

Put both in your local `.env` (and later in Vercel).

### 2.4 Configure authentication

**Email login** works out of the box (Authentication → Providers → Email is on by default; both password and magic-link sign-in are supported by the app).

**Google Sign-In:**

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create credentials → OAuth client ID** (type: *Web application*).
2. Add the redirect URI shown in Supabase under **Authentication → Providers → Google** (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copy the Client ID and Client Secret into Supabase → **Authentication → Providers → Google** and enable the provider.

**Redirect URLs:** in Supabase → **Authentication → URL Configuration**, set *Site URL* to your production URL (e.g. `https://commit-yourname.vercel.app`) and add `http://localhost:5173` to *Redirect URLs* for local dev.

### 2.5 Lock it to your account only

Commit is a single-user app. Two layers enforce this:

1. **App allow-list** — set `VITE_ALLOWED_EMAIL=you@example.com` in `.env` / Vercel. Any other account that signs in is immediately shown a "this workspace is private" screen and can't proceed. (Comma-separate to allow more than one.)
2. **Disable public signups** *(recommended)* — Supabase → **Authentication → Sign In / Up** → turn off *Allow new users to sign up* **after** you've created your own account once. Nobody else can even register.
3. *(Optional, hardest lock)* — uncomment the `email_allowed()` block at the bottom of `schema.sql` to also enforce the allow-list inside Postgres itself.

Row Level Security is on regardless, so even another signed-in user could never read your rows.

---

## 3 · Environment variables

Copy `.env.example` → `.env`:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `VITE_ALLOWED_EMAIL` | Your email — the only account allowed in |

The anon key is safe to expose in a browser app; Row Level Security is what protects your data.

---

## 4 · Upload to GitHub

```bash
cd commit
git init
git add .
git commit -m "Commit v1.0 — production build"
```

Then create an empty repository on [github.com/new](https://github.com/new) (private is fine) and:

```bash
git remote add origin https://github.com/<you>/commit.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `dist`, and `.env` — your keys never leave your machine.

---

## 5 · Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and **Import** your GitHub repo.
2. Vercel auto-detects Vite (the included `vercel.json` sets the build command, output directory, SPA rewrites, and cache headers).
3. Under **Environment Variables**, add the same three variables from your `.env`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL`.
4. Click **Deploy**. You'll get a URL like `https://commit-yourname.vercel.app`.
5. Add that URL to Supabase → **Authentication → URL Configuration** (Site URL + Redirect URLs) so Google/magic-link redirects land back in the app.

Every future `git push` to `main` redeploys automatically.

---

## 6 · Install Commit as an app (PWA)

Commit ships with a web-app manifest, icons, and a service worker (auto-generated at build time), so it installs like a native app and keeps working offline — your data is cached and shown even without a connection; writes resume when you're back online.

### iPhone / iPad — "Add to Home Screen"

1. Open your deployed URL in **Safari** (must be Safari).
2. Tap the **Share** button (square with the up-arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. Commit now launches full-screen from its own icon, with no browser chrome.

### Android

1. Open the URL in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or the "Add Commit to Home screen" banner).

### Windows

1. Open the URL in **Chrome** or **Edge**.
2. Click the **install icon** (⊕ / monitor-with-arrow) at the right end of the address bar — or menu → **Install Commit**.
3. It appears in the Start menu and taskbar like any desktop app.

### macOS

- **Chrome:** install icon in the address bar → **Install Commit**.
- **Safari 17+:** **File → Add to Dock**.

---

## 7 · How the momentum system works

- **XP:** Easy 10 · Medium 25 · Hard 50 · Epic 100. Level *n* needs `200 + (n−1)·150` XP.
- **Cascade:** completing a task updates today's ring, its project %, its category %, its goal ring (goals blend milestone progress with task progress), the sidebar level bar, streaks, and every chart — all in one animation frame, then persists to Supabase in the background.
- **Streaks:** one completed task per calendar day keeps the flame alive; the streak isn't broken until a full day passes with nothing done.
- **Recurring tasks** re-spawn themselves on their next date the moment you complete them.
- **Celebrations** (level-ups, finished goals, cleared milestone sets) use a restrained brand-toned confetti burst — noticeable, not noisy.
- **Habits** and **Savings Tracker** appear in the sidebar as locked modules; the schema and task engine already support them.

A **sample workspace** (the AWS / Georgetown / ServeCyber / apartment dataset) can be loaded from Settings or from any empty page, and is written straight into your database so you can explore every feature immediately.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login page says Supabase isn't configured | `.env` values missing or still placeholders; restart `npm run dev` after editing |
| Google button loops back to login | Redirect URLs not set in Supabase URL Configuration |
| "This workspace is private" for your own account | `VITE_ALLOWED_EMAIL` doesn't match the email on the account (check case/typos) |
| Data doesn't persist | `schema.sql` not run, or you're on a different Supabase project than your keys |
| Stale UI after a deploy | The service worker auto-updates on next load; hard-refresh once if needed |
