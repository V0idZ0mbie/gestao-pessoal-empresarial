-- Gestao Pessoal & Empresarial - schema Supabase
-- Execute este arquivo no SQL Editor do projeto:
-- https://supabase.com/dashboard/project/bnmaatcgqlzcvueszmnw/sql

create extension if not exists pgcrypto;

create table if not exists accounts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  banco text not null,
  titular text not null,
  tipo text,
  saldo numeric not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts add column if not exists is_primary boolean not null default false;
create unique index if not exists accounts_one_primary_per_user_idx
  on accounts (user_id) where is_primary;

create table if not exists clients (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  empresa text,
  email text,
  telefone text,
  endereco text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  valor numeric not null default 0,
  data date,
  categoria text,
  conta_id text,
  ordem_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gains (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  valor numeric not null default 0,
  data date,
  categoria text,
  conta_id text,
  ordem_id text,
  origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table expenses add column if not exists ordem_id text;
alter table gains add column if not exists ordem_id text;
alter table gains add column if not exists origem text;
alter table expenses add column if not exists origem text;

create index if not exists expenses_ordem_id_idx on expenses (ordem_id);
create index if not exists gains_ordem_id_idx on gains (ordem_id);

create table if not exists investments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text,
  valor numeric not null default 0,
  data date,
  lucro numeric not null default 0,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_orders (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id text,
  descricao text,
  valor numeric not null default 0,
  data_abertura date,
  data_fechamento date,
  status text not null default 'aberta',
  obs text,
  pago boolean not null default false,
  forma_pagamento text,
  conta_pagamento_id text,
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table service_orders add column if not exists pago boolean not null default false;
alter table service_orders add column if not exists forma_pagamento text;
alter table service_orders add column if not exists conta_pagamento_id text;
alter table service_orders add column if not exists data_pagamento date;
alter table service_orders add column if not exists custo_reparo numeric not null default 0;

create table if not exists services_catalog (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null,
  media numeric not null default 0,
  minimo numeric not null default 0,
  maximo numeric not null default 0,
  total_atendimentos integer not null default 0,
  faturamento_acumulado numeric not null default 0,
  exemplos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts enable row level security;
alter table clients enable row level security;
alter table expenses enable row level security;
alter table gains enable row level security;
alter table investments enable row level security;
alter table service_orders enable row level security;
alter table services_catalog enable row level security;

drop policy if exists "Users can manage their own accounts" on accounts;
create policy "Users can manage their own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own clients" on clients;
create policy "Users can manage their own clients" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own expenses" on expenses;
create policy "Users can manage their own expenses" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own gains" on gains;
create policy "Users can manage their own gains" on gains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own investments" on investments;
create policy "Users can manage their own investments" on investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own service orders" on service_orders;
create policy "Users can manage their own service orders" on service_orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own service catalog" on services_catalog;
create policy "Users can manage their own service catalog" on services_catalog
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_accounts_updated_at on accounts;
create trigger update_accounts_updated_at before update on accounts
for each row execute function update_updated_at();

drop trigger if exists update_clients_updated_at on clients;
create trigger update_clients_updated_at before update on clients
for each row execute function update_updated_at();

drop trigger if exists update_expenses_updated_at on expenses;
create trigger update_expenses_updated_at before update on expenses
for each row execute function update_updated_at();

drop trigger if exists update_gains_updated_at on gains;
create trigger update_gains_updated_at before update on gains
for each row execute function update_updated_at();

drop trigger if exists update_investments_updated_at on investments;
create trigger update_investments_updated_at before update on investments
for each row execute function update_updated_at();

drop trigger if exists update_service_orders_updated_at on service_orders;
create trigger update_service_orders_updated_at before update on service_orders
for each row execute function update_updated_at();

drop trigger if exists update_services_catalog_updated_at on services_catalog;
create trigger update_services_catalog_updated_at before update on services_catalog
for each row execute function update_updated_at();
