-- Initial schema: profiles with a free trial, subscriptions written only by
-- payment webhooks, and study sessions synced from the local database.
-- Every table has row-level security so users can only touch their own rows.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('dodo', 'razorpay', 'apple', 'google', 'manual')),
  provider_ref text not null,
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

create table public.study_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  mode text not null check (mode in ('stopwatch', 'countdown', 'pomodoro')),
  subject text,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

-- Create a profile (and start the trial) for every new sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.study_sessions enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
-- Users may edit their name and country but never their trial date.
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);
revoke update on public.profiles from authenticated;
grant update (display_name, country_code) on public.profiles to authenticated;

-- Subscriptions are read-only for users; payment webhooks write them with the service role.
create policy "read own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "manage own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
