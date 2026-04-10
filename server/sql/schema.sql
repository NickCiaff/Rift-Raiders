create table if not exists wallets (
  app_user_id text primary key,
  gems integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id bigserial primary key,
  app_user_id text not null,
  entry_type text not null,
  currency text not null,
  amount integer not null,
  reason text not null,
  idempotency_key text,
  transaction_identifier text,
  product_identifier text,
  package_identifier text,
  platform text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists ledger_entries_idempotency_key_idx
  on ledger_entries (idempotency_key)
  where idempotency_key is not null;

create table if not exists purchase_transactions (
  transaction_identifier text primary key,
  app_user_id text not null,
  package_identifier text not null,
  product_identifier text,
  platform text,
  gems_granted integer not null default 0,
  gold_granted integer not null default 0,
  source text not null,
  verified_at timestamptz not null default now(),
  raw_event jsonb not null default '{}'::jsonb
);

create table if not exists webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text,
  transaction_identifier text,
  received_at timestamptz not null default now(),
  raw_event jsonb not null
);
