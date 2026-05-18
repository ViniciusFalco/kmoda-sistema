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

-- Marcas cadastradas para peças e etiquetas.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tipos de roupa: vestido, blusa, calça, saia etc.
create table if not exists public.clothing_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tamanhos reutilizáveis e ordenáveis.
create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cores reutilizáveis com hex opcional para identificação visual.
create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos da loja, incluindo código de barras interno para busca.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  barcode text unique,
  brand_id uuid references public.brands(id) on delete set null,
  clothing_type_id uuid references public.clothing_types(id) on delete set null,
  size_id uuid references public.sizes(id) on delete set null,
  color_id uuid references public.colors(id) on delete set null,
  reference text,
  cost_price numeric(12, 2) not null default 0,
  sale_price numeric(12, 2) not null default 0,
  suggested_price numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0,
  min_stock integer not null default 0,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade para bancos criados antes da evolução do cadastro por etiqueta.
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.products add column if not exists clothing_type_id uuid references public.clothing_types(id) on delete set null;
alter table public.products add column if not exists size_id uuid references public.sizes(id) on delete set null;
alter table public.products add column if not exists color_id uuid references public.colors(id) on delete set null;
alter table public.products add column if not exists reference text;
alter table public.products add column if not exists suggested_price numeric(12, 2) not null default 0;
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
alter table public.brands enable row level security;
alter table public.clothing_types enable row level security;
alter table public.sizes enable row level security;
alter table public.colors enable row level security;
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

drop policy if exists "Authenticated users can view brands." on public.brands;
drop policy if exists "Authenticated users can create brands." on public.brands;
drop policy if exists "Authenticated users can update brands." on public.brands;
drop policy if exists "Authenticated users can delete brands." on public.brands;

create policy "Authenticated users can view brands." on public.brands
for select to authenticated using (true);
create policy "Authenticated users can create brands." on public.brands
for insert to authenticated with check (true);
create policy "Authenticated users can update brands." on public.brands
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete brands." on public.brands
for delete to authenticated using (true);

drop policy if exists "Authenticated users can view clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can create clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can update clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can delete clothing types." on public.clothing_types;

create policy "Authenticated users can view clothing types." on public.clothing_types
for select to authenticated using (true);
create policy "Authenticated users can create clothing types." on public.clothing_types
for insert to authenticated with check (true);
create policy "Authenticated users can update clothing types." on public.clothing_types
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete clothing types." on public.clothing_types
for delete to authenticated using (true);

drop policy if exists "Authenticated users can view sizes." on public.sizes;
drop policy if exists "Authenticated users can create sizes." on public.sizes;
drop policy if exists "Authenticated users can update sizes." on public.sizes;
drop policy if exists "Authenticated users can delete sizes." on public.sizes;

create policy "Authenticated users can view sizes." on public.sizes
for select to authenticated using (true);
create policy "Authenticated users can create sizes." on public.sizes
for insert to authenticated with check (true);
create policy "Authenticated users can update sizes." on public.sizes
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete sizes." on public.sizes
for delete to authenticated using (true);

drop policy if exists "Authenticated users can view colors." on public.colors;
drop policy if exists "Authenticated users can create colors." on public.colors;
drop policy if exists "Authenticated users can update colors." on public.colors;
drop policy if exists "Authenticated users can delete colors." on public.colors;

create policy "Authenticated users can view colors." on public.colors
for select to authenticated using (true);
create policy "Authenticated users can create colors." on public.colors
for insert to authenticated with check (true);
create policy "Authenticated users can update colors." on public.colors
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete colors." on public.colors
for delete to authenticated using (true);

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

alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "Authenticated users can view stock movements." on public.stock_movements;
drop policy if exists "Authenticated users can create stock movements." on public.stock_movements;
create policy "Authenticated users can view stock movements." on public.stock_movements
for select to authenticated using (true);
create policy "Authenticated users can create stock movements." on public.stock_movements
for insert to authenticated with check (true);

drop policy if exists "Authenticated users can view sales." on public.sales;
drop policy if exists "Authenticated users can create sales." on public.sales;
create policy "Authenticated users can view sales." on public.sales
for select to authenticated using (true);
create policy "Authenticated users can create sales." on public.sales
for insert to authenticated with check (true);

drop policy if exists "Authenticated users can view sale items." on public.sale_items;
drop policy if exists "Authenticated users can create sale items." on public.sale_items;
create policy "Authenticated users can view sale items." on public.sale_items
for select to authenticated using (true);
create policy "Authenticated users can create sale items." on public.sale_items
for insert to authenticated with check (true);

drop policy if exists "Authenticated users can view cash movements." on public.cash_movements;
drop policy if exists "Authenticated users can create cash movements." on public.cash_movements;
create policy "Authenticated users can view cash movements." on public.cash_movements
for select to authenticated using (true);
create policy "Authenticated users can create cash movements." on public.cash_movements
for insert to authenticated with check (true);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists clothing_types_set_updated_at on public.clothing_types;
create trigger clothing_types_set_updated_at before update on public.clothing_types
for each row execute function public.set_updated_at();

drop trigger if exists sizes_set_updated_at on public.sizes;
create trigger sizes_set_updated_at before update on public.sizes
for each row execute function public.set_updated_at();

drop trigger if exists colors_set_updated_at on public.colors;
create trigger colors_set_updated_at before update on public.colors
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at before update on public.sales
for each row execute function public.set_updated_at();

create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_reference_idx on public.products (reference);
create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_clothing_type_id_idx on public.products (clothing_type_id);
create index if not exists products_size_id_idx on public.products (size_id);
create index if not exists products_color_id_idx on public.products (color_id);
create index if not exists products_active_idx on public.products (active);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists cash_movements_movement_date_idx on public.cash_movements (movement_date);
