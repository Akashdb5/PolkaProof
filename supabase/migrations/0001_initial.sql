create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  address text primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  deadline timestamptz,
  organizer_id text not null,
  qr_secret text,
  location text,
  banner_url text,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Nonces
create table if not exists public.nonces (
  value uuid primary key,
  event_id uuid references events(id) on delete cascade,
  address text,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

-- Attendance
create type attendance_status as enum ('confirmed', 'revoked');

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  address text not null references profiles(address),
  signature text not null,
  signed_message text not null,
  nonce uuid not null references nonces(value),
  issued_at timestamptz not null,
  verified_at timestamptz not null default now(),
  status attendance_status not null default 'confirmed',
  metadata jsonb default '{}'::jsonb,
  unique (event_id, address)
);

-- Badges
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  address text not null references profiles(address),
  image_url text,
  metadata jsonb default '{}'::jsonb,
  issued_at timestamptz default now()
);

-- Streaks
create table if not exists public.streaks (
  address text primary key references profiles(address),
  current_streak int default 0,
  longest_streak int default 0,
  updated_at timestamptz default now()
);

-- Leaderboard materialized view example
create materialized view if not exists public.event_leaderboard as
select
  event_id,
  address,
  count(*) as checkins
from event_attendance
group by event_id, address;

-- Row Level Security
alter table events enable row level security;
alter table profiles enable row level security;
alter table event_attendance enable row level security;

create policy "public read events" on events
for select using (true);

create policy "public read profiles" on profiles
for select using (true);

create policy "anon insert attendance" on event_attendance
for insert with check (true);

create policy "self read attendance" on event_attendance
for select using (auth.uid()::text = address);

-- helper function to refresh leaderboard
create or replace function public.refresh_event_leaderboard()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently public.event_leaderboard;
$$;

create or replace function public.get_polkaproof_metrics()
returns table(
  events bigint,
  checkins bigint,
  attendees bigint,
  organizers bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.events) as events,
    (select count(*) from public.event_attendance) as checkins,
    (select count(*) from public.profiles) as attendees,
    (select count(distinct organizer_id) from public.events) as organizers;
$$;

create or replace function public.get_event_by_identifier(identifier text)
returns setof public.events
language sql
security definer
set search_path = public
as $$
  select *
  from public.events
  where slug = identifier
  union
  select *
  from public.events
  where id::text = identifier
  limit 1;
$$;
