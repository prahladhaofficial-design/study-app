-- Study arena: a leaderboard of focus time and a country-vs-country total.
-- Totals come from synced sessions (sync_rows kind 'sessions'). The functions
-- run with definer rights so they can sum everyone's time, but they only
-- return names, countries and minutes, never ids or session details.

-- Only count plausible sessions: started in the past, at most 12 hours long.
create function public.arena_minutes(since timestamptz)
returns table (user_id uuid, minutes bigint)
language sql stable security definer set search_path = '' as $$
  select s.user_id,
         (sum(least((s.data->>'durationMs')::bigint, 12 * 3600000)) / 60000)::bigint as minutes
  from public.sync_rows s
  where s.kind = 'sessions'
    and not s.deleted
    and s.data ? 'durationMs'
    and (s.data->>'startedAt')::bigint >= (extract(epoch from greatest(since, now() - interval '400 days')) * 1000)::bigint
    and (s.data->>'startedAt')::bigint <= (extract(epoch from now()) * 1000)::bigint
  group by s.user_id
$$;
revoke all on function public.arena_minutes(timestamptz) from public, anon, authenticated;

create function public.arena_leaderboard(since timestamptz, max_rows int default 100)
returns table (rank bigint, display_name text, country_code text, minutes bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select m.user_id, m.minutes, rank() over (order by m.minutes desc) as rank
    from public.arena_minutes(since) m
    where m.minutes > 0
  )
  select t.rank, coalesce(nullif(trim(p.display_name), ''), 'Anonymous'), p.country_code, t.minutes, t.user_id = auth.uid()
  from totals t
  join public.profiles p on p.id = t.user_id
  where t.rank <= least(max_rows, 200) or t.user_id = auth.uid()
  order by t.rank
$$;

create function public.arena_countries(since timestamptz)
returns table (country_code text, minutes bigint, students bigint)
language sql stable security definer set search_path = '' as $$
  select p.country_code, sum(m.minutes)::bigint, count(*)::bigint
  from public.arena_minutes(since) m
  join public.profiles p on p.id = m.user_id
  where p.country_code is not null and m.minutes > 0
  group by p.country_code
  order by 2 desc
$$;

revoke all on function public.arena_leaderboard(timestamptz, int) from public, anon;
revoke all on function public.arena_countries(timestamptz) from public, anon;
grant execute on function public.arena_leaderboard(timestamptz, int) to authenticated;
grant execute on function public.arena_countries(timestamptz) to authenticated;

-- Display names show on the leaderboard, so keep them short and printable.
alter table public.profiles
  add constraint profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 24);
