-- Payments through Dodo. The dodo-webhook edge function (service role) writes
-- subscriptions; users can only read their own rows (policy from 0001).

alter table public.subscriptions
  add column provider_customer text,
  -- When the payment provider produced the latest state we stored, so a
  -- late-arriving older webhook can't overwrite a newer one.
  add column provider_event_at timestamptz;

create index subscriptions_customer_idx on public.subscriptions (provider, provider_customer);

-- Each webhook is processed once, even when the provider retries it.
create table public.payment_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
-- No policies: only the service role (edge functions) can read or write.
