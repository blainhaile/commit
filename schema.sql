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

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists tasks_user_idx      on public.tasks (user_id);
create index if not exists tasks_deadline_idx  on public.tasks (user_id, deadline);
create index if not exists tasks_status_idx    on public.tasks (user_id, status);
create index if not exists projects_user_idx   on public.projects (user_id);
create index if not exists goals_user_idx      on public.goals (user_id);
create index if not exists categories_user_idx on public.categories (user_id);

-- ── Row Level Security: each user can only touch their own rows ────
alter table public.categories enable row level security;
alter table public.goals      enable row level security;
alter table public.projects   enable row level security;
alter table public.tasks      enable row level security;
alter table public.settings   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','goals','projects','tasks','settings'] loop
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
