-- ════════════════════════════════════════════════════════════════════
-- Commit · Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- Creates all tables, indexes, and Row Level Security policies.
-- ════════════════════════════════════════════════════════════════════

-- ── Categories ──────────────────────────────────────────────────────
create table if not exists public.categories (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#7091E6',
  icon       text not null default 'Tag',
  sort_index integer not null default 0,  -- manual drag-and-drop order
  created_at timestamptz not null default now()
);

-- ── Goals ───────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text not null default '',
  category_id text,
  target_date date,
  milestones  jsonb not null default '[]'::jsonb,  -- [{id,title,done}]
  sort_index  integer not null default 0,           -- manual drag-and-drop order
  created_at  timestamptz not null default now()
);

-- ── Projects ────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text not null default '',
  category_id text,
  goal_id     text,
  target_date date,
  sort_index  integer not null default 0,  -- manual drag-and-drop order
  created_at  timestamptz not null default now()
);

-- ── Tasks (calendar events, notes and subtasks live here too) ──────
create table if not exists public.tasks (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  notes        text not null default '',
  priority     text not null default 'Medium',      -- Critical|High|Medium|Low
  difficulty   text not null default 'Medium',      -- Easy|Medium|Hard|Epic
  status       text not null default 'Not Started', -- Not Started|In Progress|Completed|Archived
  recurring    text not null default 'None',        -- None|Daily|Weekly|Monthly
  category_id  text,
  project_id   text,
  goal_id      text,
  deadline     date,
  deadline_time text,  -- optional "HH:mm" (24h), null = date-only deadline
  start_date   date,
  duration     integer not null default 30,         -- minutes
  tags         text[] not null default '{}',
  subtasks     jsonb not null default '[]'::jsonb,  -- [{id,title,done}]
  created_date date not null default current_date,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Settings (one row per user: theme, widgets, notifications, XP prefs) ──
create table if not exists public.settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Habits ──────────────────────────────────────────────────────────
create table if not exists public.habits (
  id                    text primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  name                  text not null,
  category_id           text,
  description           text not null default '',
  frequency_type        text not null default 'Daily',   -- Daily|Weekly
  target_days_per_week  integer,                          -- set only when frequency_type = 'Weekly'
  goal_amount           numeric not null default 1,
  measurement_unit      text not null default 'count',    -- minutes|count|hours|pages…
  xp_reward             integer not null default 10,
  difficulty            text not null default 'Medium',   -- Easy|Medium|Hard|Epic
  streak_multipliers    jsonb not null default
    '[{"days":7,"multiplier":1.1},{"days":30,"multiplier":1.25},{"days":90,"multiplier":1.5},{"days":365,"multiplier":2}]'::jsonb,
  start_date            date not null default current_date,
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);

-- ── Habit completions (one row per habit per day) ────────────────────
create table if not exists public.habit_completions (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  habit_id    text not null references public.habits (id) on delete cascade,
  date        date not null,
  status      text not null default 'Completed',  -- Completed|Partial|Missed
  amount      numeric not null default 0,
  notes       text not null default '',
  xp_earned   integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (habit_id, date)
);

-- ── Manual ordering (drag-and-drop) ─────────────────────────────────
-- Safe to leave here and re-run anytime — only adds the column if missing.
-- Existing rows default to 0; run the one-time backfill separately to seed
-- initial order from created_at (do NOT add that backfill here — re-running
-- it later would silently overwrite any manual reordering you've since done).
alter table public.categories add column if not exists sort_index integer not null default 0;
alter table public.goals      add column if not exists sort_index integer not null default 0;
alter table public.projects   add column if not exists sort_index integer not null default 0;
alter table public.tasks      add column if not exists deadline_time text;

-- ── Habit color-coding ───────────────────────────────────────────────
-- Safe to leave here and re-run anytime — only adds the column if missing.
-- Existing habits all land on the same default swatch until edited, same
-- as any category would have before it got its own color.
alter table public.habits add column if not exists color text not null default '#3D52A0';

-- ── Yearly archive ───────────────────────────────────────────────────
-- Safe to leave here and re-run anytime — only adds the column if missing.
-- The default only stamps NEW rows correctly (now() is volatile, so ADD COLUMN
-- computes it once and applies that single value to all existing rows) — run
-- the one-time backfill separately to derive each existing row's real year.
-- habits itself is intentionally excluded: an active recurring habit isn't a
-- year-scoped item the way a finished project is (see habit_completions instead).
alter table public.categories        add column if not exists year integer not null default extract(year from now())::integer;
alter table public.goals             add column if not exists year integer not null default extract(year from now())::integer;
alter table public.projects          add column if not exists year integer not null default extract(year from now())::integer;
alter table public.tasks             add column if not exists year integer not null default extract(year from now())::integer;
alter table public.habit_completions add column if not exists year integer not null default extract(year from now())::integer;

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists tasks_user_idx              on public.tasks (user_id);
create index if not exists tasks_deadline_idx          on public.tasks (user_id, deadline);
create index if not exists tasks_status_idx            on public.tasks (user_id, status);
create index if not exists tasks_year_idx              on public.tasks (user_id, year);
create index if not exists projects_user_idx           on public.projects (user_id);
create index if not exists projects_year_idx           on public.projects (user_id, year);
create index if not exists goals_user_idx              on public.goals (user_id);
create index if not exists goals_year_idx              on public.goals (user_id, year);
create index if not exists categories_user_idx         on public.categories (user_id);
create index if not exists categories_year_idx         on public.categories (user_id, year);
create index if not exists habits_user_idx             on public.habits (user_id);
create index if not exists habit_completions_user_idx  on public.habit_completions (user_id);
create index if not exists habit_completions_habit_idx on public.habit_completions (habit_id, date);
create index if not exists habit_completions_year_idx  on public.habit_completions (user_id, year);

-- ── Row Level Security: each user can only touch their own rows ────
alter table public.categories        enable row level security;
alter table public.goals             enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.settings          enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_completions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','goals','projects','tasks','settings','habits','habit_completions'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ── Optional hard single-user lock at the database level ────────────
-- Replace the email below with yours and uncomment to also enforce the
-- allow-list inside Postgres (the app already enforces it client-side).
--
-- create or replace function public.email_allowed() returns boolean
-- language sql stable as $$
--   select coalesce(auth.jwt() ->> 'email', '') = lower('you@example.com')
-- $$;
--
-- Then add "and public.email_allowed()" to each policy's using/with check.
