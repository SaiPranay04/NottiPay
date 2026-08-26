-- Vezora Finance V1 — run in the Supabase SQL editor after you have a project.
-- RLS: every user-owned row is locked to auth.uid().

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  timezone text not null default 'Europe/London',
  inr_display text not null default 'always',
  confirm_threshold_minor bigint not null default 1500,
  emergency_floor_minor bigint not null default 0,
  next_payday date,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null,
  currency char(3) not null,
  balance_minor bigint not null default 0,
  include_in_safe_spend boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  essential boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  status text not null default 'posted',
  account_id uuid not null references public.accounts (id),
  counterparty_account_id uuid references public.accounts (id),
  amount_minor bigint not null,
  currency char(3) not null,
  rate_used numeric(18,8),
  rate_source text,
  amount_inr_minor bigint,
  category_id text,
  merchant text,
  note text,
  occurred_at timestamptz not null,
  transfer_group_id uuid,
  commitment_id uuid,
  shift_id uuid,
  client_id text,
  created_via text not null default 'form',
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  limit_minor bigint not null,
  primary key (user_id, category_id)
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  amount_minor bigint not null,
  currency char(3) not null,
  account_id uuid references public.accounts (id),
  due_date date not null,
  recurrence text not null default 'once',
  status text not null default 'upcoming',
  linked_transaction_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role text,
  location text,
  hourly_rate_minor bigint not null
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  employer_id uuid references public.employers (id),
  work_date date not null,
  actual_start timestamptz,
  actual_end timestamptz,
  unpaid_break_minutes int not null default 0,
  worked_minutes int not null,
  hourly_rate_minor bigint not null,
  expected_gross_minor bigint not null,
  paid boolean not null default false,
  income_transaction_id uuid
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sanctioned_minor bigint not null,
  currency char(3) not null default 'INR',
  annual_rate numeric(8,4) not null,
  start_date date not null,
  moratorium_end date
);

create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  loan_id uuid not null references public.loans (id) on delete cascade,
  kind text not null,
  amount_minor bigint not null,
  currency char(3) not null,
  occurred_at date not null,
  note text
);

create table if not exists public.fx_rates (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade,
  base char(3) not null default 'GBP',
  quote char(3) not null default 'INR',
  rate numeric(18,8) not null,
  source text not null,
  as_of timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (base, quote, source, as_of)
);

create table if not exists public.audit_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.commitments enable row level security;
alter table public.employers enable row level security;
alter table public.shifts enable row level security;
alter table public.loans enable row level security;
alter table public.loan_events enable row level security;
alter table public.fx_rates enable row level security;
alter table public.audit_events enable row level security;

create policy "own rows" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.commitments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.employers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.shifts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.loan_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.fx_rates for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
create policy "own rows" on public.audit_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
