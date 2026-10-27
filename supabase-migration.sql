-- ============================================================
-- MIGRAÇÃO SUPABASE — Gestão Pessoal & Empresarial
-- Execute no Supabase SQL Editor:
--   https://supabase.com/dashboard/project/bnmaatcgqlzcvueszmnw
-- ============================================================

-- ==========================================
-- 1. TABELAS
-- ==========================================

-- Contas bancárias
create table if not exists accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  banco       text not null,
  titular     text not null,
  tipo        text,
  saldo       numeric,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- Clientes
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  nome        text not null,
  empresa     text,
  email       text,
  telefone    text,
  endereco    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- Gastos
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  descricao   text not null,
  valor       numeric,
  data        date,
  categoria   text,
  conta_id    uuid,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- Investimentos
create table if not exists investments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  nome        text not null,
  tipo        text,
  valor       numeric,
  data        date,
  lucro       numeric,
  obs         text,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- Ordens de Serviço
create table if not exists service_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  cliente_id      uuid,
  descricao       text,
  valor           numeric,
  data_abertura   date,
  data_fechamento date,
  status          text default 'aberta',
  obs             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz
);

-- ==========================================
-- 2. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table accounts enable row level security;
alter table clients enable row level security;
alter table expenses enable row level security;
alter table investments enable row level security;
alter table service_orders enable row level security;

create policy "Usuários só veem o próprios dados" on accounts
  for all using (auth.uid() = user_id);

create policy "Usuários só veem o próprios dados" on clients
  for all using (auth.uid() = user_id);

create policy "Usuários só veem o próprios dados" on expenses
  for all using (auth.uid() = user_id);

create policy "Usuários só veem o próprios dados" on investments
  for all using (auth.uid() = user_id);

create policy "Usuários só veem o próprios dados" on service_orders
  for all using (auth.uid() = user_id);

-- ==========================================
-- 3. TRIGGERS PARA ATUALIZAR `updated_at`
-- ==========================================

do $$
declare
  tables_text text;
begin
  -- Atualiza updated_at em todas as tabelas
  execute '
    create or replace function update_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;

    create trigger update_accounts_updated_at
      before update on accounts
      for each row execute function update_updated_at();

    create trigger update_clients_updated_at
      before update on clients
      for each row execute function update_updated_at();

    create trigger update_expenses_updated_at
      before update on expenses
      for each row execute function update_updated_at();

    create trigger update_investments_updated_at
      before update on investments
      for each row execute function update_updated_at();

    create trigger update_service_orders_updated_at
      before update on service_orders
      for each row execute function update_updated_at();
  ';
end $$;

-- ==========================================
-- 4. DADOS DE EXEMPLO (opcional)
-- ==========================================

insert into accounts (user_id, banco, titular, tipo, saldo)
values ('00000000-0000-0000-0000-000000000000', 'Teste', 'Teste', 'Corrente', 1000);

insert into clients (user_id, nome, empresa, email, telefone, endereco)
values ('00000000-0000-0000-0000-000000000000', 'Teste', 'Teste', 'teste@example.com', '(11) 99999-9999', 'Rua Teste, 123');

insert into expenses (user_id, descricao, valor, data, categoria)
values ('00000000-0000-0000-0000-000000000000', 'Teste de gasto', 50.00, current_date, 'Alimentação');

insert into investments (user_id, nome, tipo, valor, data, lucro)
values ('00000000-0000-0000-0000-000000000000', 'Teste de investimento', 'Ações', 1000.00, current_date, 50.00);

insert into service_orders (user_id, cliente_id, descricao, valor, status)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Teste de ordem de serviço', 200.00, 'aberta');

-- ============================================================
-- Notas:
-- 1. Substitua '00000000-0000-0000-0000-000000000000' pelo user_id
--    real do usuário logado (obtido via auth.uid()).
-- 2. Remova as linhas de exemplo se não precisar.
-- 3. Reinicie o app após a migração.
-- ============================================================
