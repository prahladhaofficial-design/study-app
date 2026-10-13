-- Cloud backup and sync for everything stored on the device.
-- Each local row (a session, a flashcard, a task...) is mirrored as one row
-- here, keyed by its table ("kind") and id. Deletes are kept as tombstones so
-- other devices learn about them. server_ts lets each device ask "what changed
-- since I last looked" without trusting device clocks.

create table public.sync_rows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('sessions', 'decks', 'cards', 'dumps', 'explanations', 'sketches', 'goals', 'tasks', 'moments', 'projects')),
  id text not null check (length(id) <= 64),
  data jsonb,
  deleted boolean not null default false,
  -- The device's edit time (ms since epoch); the newest edit wins.
  updated_at bigint not null,
  server_ts timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);
create index sync_rows_pull_idx on public.sync_rows (user_id, server_ts);

-- Stamp server time on every write, and ignore writes older than what is
-- already stored so a device that was offline can't overwrite newer edits.
create function public.sync_rows_stamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_ts := clock_timestamp();
  return new;
end;
$$;

create trigger sync_rows_stamp before insert or update on public.sync_rows
  for each row execute function public.sync_rows_stamp();

alter table public.sync_rows enable row level security;

create policy "Read own rows" on public.sync_rows
  for select using (user_id = auth.uid());
create policy "Insert own rows" on public.sync_rows
  for insert with check (user_id = auth.uid());
create policy "Update own rows" on public.sync_rows
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
