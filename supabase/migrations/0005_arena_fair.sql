-- Study arena fixes:
-- 1. One malformed synced session can no longer break the leaderboard for
--    everyone: values are checked to be JSON numbers and summed as numeric,
--    so nothing is cast to bigint before it's known to be in range.
-- 2. Sessions typed in by hand (data.manual = true) don't count, and each
--    person counts for at most 16 hours a day (UTC).
-- 3. Only people who joined (picked a name) are listed, and anyone can hide
--    themselves.

alter table public.profiles add column arena_hidden boolean not null default false;
grant update (arena_hidden) on public.profiles to authenticated;

create or replace function public.arena_minutes(since timestamptz)
returns table (user_id uuid, minutes bigint)
language sql stable security definer set search_path = '' as $$
  with sessions as (
    -- The CASEs guarantee nothing is cast unless it's a JSON number, whatever order the planner runs the filters in.
    select s.user_id,
           case when jsonb_typeof(s.data->'startedAt') = 'number' then (s.data->>'startedAt')::numeric end as started_ms,
           case when jsonb_typeof(s.data->'durationMs') = 'number'
                then least(greatest((s.data->>'durationMs')::numeric, 0), 12 * 3600000) end as duration_ms
    from public.sync_rows s
    where s.kind = 'sessions'
      and not s.deleted
      and jsonb_typeof(s.data->'durationMs') = 'number'
      and jsonb_typeof(s.data->'startedAt') = 'number'
      and coalesce(s.data->'manual', 'false'::jsonb) <> 'true'::jsonb
  ),
  daily as (
    select x.user_id,
           floor(x.started_ms / 86400000) as day,
           least(sum(x.duration_ms), 16 * 3600000) as ms
    from sessions x
    where x.started_ms >= extract(epoch from greatest(since, now() - interval '400 days')) * 1000
      and x.started_ms <= extract(epoch from now()) * 1000
    group by x.user_id, floor(x.started_ms / 86400000)
  )
  select d.user_id, floor(sum(d.ms) / 60000)::bigint as minutes
  from daily d
  group by d.user_id
$$;
revoke all on function public.arena_minutes(timestamptz) from public, anon, authenticated;

create or replace function public.arena_leaderboard(since timestamptz, max_rows int default 100)
returns table (rank bigint, display_name text, country_code text, minutes bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select m.user_id, m.minutes, p.display_name, p.country_code,
           rank() over (order by m.minutes desc) as rank
    from public.arena_minutes(since) m
    join public.profiles p on p.id = m.user_id
    where m.minutes > 0
      and nullif(trim(p.display_name), '') is not null
      and not p.arena_hidden
  )
  select t.rank, trim(t.display_name), t.country_code, t.minutes, t.user_id = auth.uid()
  from totals t
  where t.rank <= least(max_rows, 200) or t.user_id = auth.uid()
  order by t.rank
$$;

create or replace function public.arena_countries(since timestamptz)
returns table (country_code text, minutes bigint, students bigint)
language sql stable security definer set search_path = '' as $$
  select p.country_code, sum(m.minutes)::bigint, count(*)::bigint
  from public.arena_minutes(since) m
  join public.profiles p on p.id = m.user_id
  where p.country_code is not null
    and m.minutes > 0
    and nullif(trim(p.display_name), '') is not null
    and not p.arena_hidden
  group by p.country_code
  order by 2 desc
$$;
