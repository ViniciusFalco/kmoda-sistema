-- Schema inicial do KModa Admin.
-- Execute este arquivo no SQL Editor do Supabase após criar o projeto.

create extension if not exists "pgcrypto";

-- Atualiza updated_at automaticamente em tabelas com esse campo.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Perfis administrativos vinculados ao Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'admin' check (role in ('admin', 'operator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categorias usadas para organizar produtos.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos da loja, incluindo código de barras interno para busca.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  brand text,
  reference text,
  barcode text unique,
  cost_price numeric(12, 2) not null default 0,
  sale_price numeric(12, 2) not null default 0,
  suggested_price numeric(12, 2),
  stock_quantity integer not null default 0,
  min_stock integer not null default 0,
  size text,
  color text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade para bancos criados antes da evolução do cadastro por etiqueta.
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists reference text;
alter table public.products add column if not exists suggested_price numeric(12, 2);
alter table public.products add column if not exists min_stock integer not null default 0;
alter table public.products add column if not exists active boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'status'
  ) then
    update public.products
    set active = case when status = 'inactive' then false else true end;
  end if;
end $$;

-- Categorias e produtos são compartilhados entre usuários autenticados da loja.
alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Authenticated users can view categories." on public.categories;
drop policy if exists "Authenticated users can create categories." on public.categories;
drop policy if exists "Authenticated users can update categories." on public.categories;
drop policy if exists "Authenticated users can delete categories." on public.categories;

create policy "Authenticated users can view categories."
on public.categories for select
to authenticated
using (true);

create policy "Authenticated users can create categories."
on public.categories for insert
to authenticated
with check (true);

create policy "Authenticated users can update categories."
on public.categories for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete categories."
on public.categories for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can view products." on public.products;
drop policy if exists "Authenticated users can create products." on public.products;
drop policy if exists "Authenticated users can update products." on public.products;
drop policy if exists "Authenticated users can delete products." on public.products;

create policy "Authenticated users can view products."
on public.products for select
to authenticated
using (true);

create policy "Authenticated users can create products."
on public.products for insert
to authenticated
with check (true);

create policy "Authenticated users can update products."
on public.products for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete products."
on public.products for delete
to authenticated
using (true);

-- Clientes usados no histórico de vendas e atendimento.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  email text,
  cpf text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vendas finalizadas ou canceladas no caixa.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric(12, 2) not null default 0,
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito')),
  status text not null default 'finalizada' check (status in ('aberta', 'finalizada', 'cancelada')),
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Itens individuais de cada venda.
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Histórico de entradas, saídas, perdas, trocas e ajustes de estoque.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('entrada', 'saida')),
  reason text not null check (reason in ('cadastro_inicial', 'compra', 'venda', 'ajuste_manual', 'troca', 'perda')),
  quantity integer not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements
add constraint stock_movements_reason_check
check (reason in ('cadastro_inicial', 'compra', 'venda', 'ajuste_manual', 'troca', 'perda'));

-- Movimentações financeiras do caixa.
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  type text not null check (type in ('entrada', 'saida')),
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  movement_date date not null default current_date,
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito')),
  notes text,
  created_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create trigger sales_set_updated_at before update on public.sales
for each row execute function public.set_updated_at();

create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_reference_idx on public.products (reference);
create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_active_idx on public.products (active);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists cash_movements_movement_date_idx on public.cash_movements (movement_date);
