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

create sequence if not exists public.cash_movement_code_seq;

create or replace function public.set_cash_movement_code()
returns trigger as $$
begin
  if new.movement_code is null or trim(new.movement_code) = '' then
    new.movement_code := 'CX-' || lpad(nextval('public.cash_movement_code_seq')::text, 6, '0');
  end if;

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

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view profiles." on public.profiles;
drop policy if exists "Authenticated users can create profiles." on public.profiles;
drop policy if exists "Authenticated users can update profiles." on public.profiles;
create policy "Authenticated users can view profiles." on public.profiles
for select to authenticated
using (auth.uid() = user_id);
create policy "Authenticated users can create profiles." on public.profiles
for insert to authenticated
with check (auth.uid() = user_id);
create policy "Authenticated users can update profiles." on public.profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

-- Modelo base do produto: referência, nome e família para agrupar variações.
create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reference text,
  name text not null,
  family text,
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.clothing_types(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos da loja, incluindo código de barras interno para busca.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  barcode text unique,
  product_model_id uuid references public.product_models(id) on delete set null,
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
alter table public.products add column if not exists product_model_id uuid references public.product_models(id) on delete set null;
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
alter table public.product_models enable row level security;
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

drop policy if exists "Authenticated users can view product models." on public.product_models;
drop policy if exists "Authenticated users can create product models." on public.product_models;
drop policy if exists "Authenticated users can update product models." on public.product_models;
drop policy if exists "Authenticated users can delete product models." on public.product_models;

create policy "Authenticated users can view product models." on public.product_models
for select to authenticated using (true);
create policy "Authenticated users can create product models." on public.product_models
for insert to authenticated with check (true);
create policy "Authenticated users can update product models." on public.product_models
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete product models." on public.product_models
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
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria')),
  installments_count integer not null default 1 check (installments_count >= 1),
  status text not null default 'finalizada' check (status in ('aberta', 'finalizada', 'cancelada')),
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales drop constraint if exists sales_installments_count_check;
alter table public.sales
add constraint sales_installments_count_check
check (installments_count >= 1);

-- Itens individuais de cada venda.
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  pricing_kind text not null default 'cash' check (pricing_kind in ('cash', 'installment')),
  original_unit_price numeric(12, 2) not null default 0,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  installments_count integer not null default 1 check (installments_count >= 1),
  installment_value numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sale_items add column if not exists pricing_kind text not null default 'cash';
alter table public.sale_items add column if not exists original_unit_price numeric(12, 2) not null default 0;
alter table public.sale_items add column if not exists installments_count integer not null default 1;
alter table public.sale_items add column if not exists installment_value numeric(12, 2) not null default 0;
alter table public.sale_items add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
alter table public.sale_items alter column product_id drop not null;
alter table public.sale_items drop constraint if exists sale_items_product_id_fkey;
alter table public.sale_items
add constraint sale_items_product_id_fkey
foreign key (product_id) references public.products(id) on delete set null;

alter table public.sale_items drop constraint if exists sale_items_pricing_kind_check;
alter table public.sale_items
add constraint sale_items_pricing_kind_check
check (pricing_kind in ('cash', 'installment'));

alter table public.sale_items drop constraint if exists sale_items_installments_count_check;
alter table public.sale_items
add constraint sale_items_installments_count_check
check (installments_count >= 1);

update public.sale_items si
set
  pricing_kind = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then 'installment'
    else 'cash'
  end,
  original_unit_price = case
    when coalesce(si.quantity, 0) > 0 then round((si.total_price / si.quantity)::numeric, 2)
    else 0
  end,
  unit_price = case
    when coalesce(si.quantity, 0) > 0 then round((si.total_price / si.quantity)::numeric, 2)
    else 0
  end,
  installments_count = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then s.installments_count
    else 1
  end,
  installment_value = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then round((si.total_price / greatest(s.installments_count, 1))::numeric, 2)
    else si.total_price
  end
from public.sales s
where s.id = si.sale_id;

-- Histórico de entradas, saídas, perdas, trocas e ajustes de estoque.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null default '{}'::jsonb,
  sale_id uuid references public.sales(id) on delete set null,
  type text not null check (type in ('entrada', 'saida')),
  reason text not null check (
    reason in (
      'cadastro_inicial',
      'compra',
      'devolucao',
      'ajuste_positivo',
      'correcao_estoque',
      'venda',
      'venda_manual',
      'ajuste_manual',
      'troca',
      'perda',
      'avaria',
      'ajuste_negativo',
      'devolucao_ao_fornecedor'
    )
  ),
  quantity integer not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
alter table public.stock_movements alter column product_id drop not null;
alter table public.stock_movements drop constraint if exists stock_movements_product_id_fkey;
alter table public.stock_movements
add constraint stock_movements_product_id_fkey
foreign key (product_id) references public.products(id) on delete set null;
alter table public.stock_movements
add constraint stock_movements_reason_check
check (
  reason in (
    'cadastro_inicial',
    'compra',
    'devolucao',
    'ajuste_positivo',
    'correcao_estoque',
    'venda',
    'venda_manual',
    'ajuste_manual',
    'troca',
    'perda',
    'avaria',
    'ajuste_negativo',
    'devolucao_ao_fornecedor'
  )
);

create or replace function public.build_product_snapshot(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(pm.name, p.name),
    'barcode', p.barcode,
    'reference', coalesce(pm.reference, p.reference),
    'product_model_id', p.product_model_id,
    'product_model_name', pm.name,
    'product_model_reference', pm.reference,
    'product_model_family', pm.family,
    'brand_id', p.brand_id,
    'brand_name', b.name,
    'clothing_type_id', p.clothing_type_id,
    'clothing_type_name', ct.name,
    'size_id', p.size_id,
    'size_name', sz.name,
    'color_id', p.color_id,
    'color_name', cl.name
  )
  from public.products p
  left join public.product_models pm on pm.id = p.product_model_id
  left join public.brands b on b.id = p.brand_id
  left join public.clothing_types ct on ct.id = p.clothing_type_id
  left join public.sizes sz on sz.id = p.size_id
  left join public.colors cl on cl.id = p.color_id
  where p.id = p_product_id;
$$;

create or replace function public.populate_product_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is not null and coalesce(new.product_snapshot, '{}'::jsonb) = '{}'::jsonb then
    new.product_snapshot := public.build_product_snapshot(new.product_id);
  end if;

  return new;
end;
$$;

drop trigger if exists sale_items_populate_product_snapshot on public.sale_items;
create trigger sale_items_populate_product_snapshot
before insert on public.sale_items
for each row execute function public.populate_product_snapshot();

drop trigger if exists stock_movements_populate_product_snapshot on public.stock_movements;
create trigger stock_movements_populate_product_snapshot
before insert on public.stock_movements
for each row execute function public.populate_product_snapshot();

create or replace function public.admin_delete_product_with_pin(
  p_product_id uuid,
  p_pin text,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, role
  into v_actor_user_id, v_actor_role
  from public.get_authenticated_user_by_pin(p_pin, coalesce(p_user_id, auth.uid()));

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  if v_actor_role <> 'admin' then
    raise exception 'Acesso restrito.';
  end if;

  delete from public.products
  where id = p_product_id;
end;
$$;

-- Movimentações financeiras do caixa.
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  sale_payment_id uuid,
  cash_session_id uuid,
  movement_code text not null,
  type text not null check (type in ('income', 'expense')),
  origin text not null default 'manual_expense' check (origin in ('sale', 'promissory', 'manual_expense', 'manual_income', 'stock')),
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  movement_date date not null default current_date,
  payment_method text check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  opening_amount numeric(12, 2) not null default 0,
  closing_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  difference_amount numeric(12, 2),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references auth.users(id) on delete set null,
  closed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recebimentos detalhados de cada venda.
create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  source_kind text not null check (source_kind in ('cash_total', 'installment_group', 'promissory_group')),
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria')),
  amount numeric(12, 2) not null check (amount >= 0),
  installments_count integer not null default 1 check (installments_count >= 1),
  installment_value numeric(12, 2) not null default 0,
  cash_movement_id uuid references public.cash_movements(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Títulos de promissória gerados a partir de vendas.
create table if not exists public.promissory_notes (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric(12, 2) not null default 0,
  installments_count integer not null default 1 check (installments_count >= 1),
  interval_days integer not null default 30 check (interval_days >= 1),
  first_due_date date not null,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parcelas individuais da promissória.
create table if not exists public.promissory_installments (
  id uuid primary key default gen_random_uuid(),
  promissory_note_id uuid not null references public.promissory_notes(id) on delete cascade,
  installment_number integer not null check (installment_number >= 1),
  due_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria')),
  cash_movement_id uuid references public.cash_movements(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promissory_note_id, installment_number)
);

alter table public.cash_movements
add constraint cash_movements_cash_session_id_fkey
foreign key (cash_session_id) references public.cash_sessions(id) on delete set null;

alter table public.cash_movements add column if not exists sale_payment_id uuid;
alter table public.cash_movements drop constraint if exists cash_movements_sale_payment_id_fkey;
alter table public.cash_movements
add constraint cash_movements_sale_payment_id_fkey
foreign key (sale_payment_id) references public.sale_payments(id) on delete set null;

alter table public.stock_movements
add column if not exists cash_movement_id uuid references public.cash_movements(id) on delete set null;

alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.promissory_notes enable row level security;
alter table public.promissory_installments enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.customers enable row level security;

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

drop policy if exists "Authenticated users can view sale payments." on public.sale_payments;
drop policy if exists "Authenticated users can create sale payments." on public.sale_payments;
create policy "Authenticated users can view sale payments." on public.sale_payments
for select to authenticated using (true);
create policy "Authenticated users can create sale payments." on public.sale_payments
for insert to authenticated with check (true);

drop policy if exists "Authenticated users can view promissory notes." on public.promissory_notes;
drop policy if exists "Authenticated users can create promissory notes." on public.promissory_notes;
drop policy if exists "Authenticated users can update promissory notes." on public.promissory_notes;
create policy "Authenticated users can view promissory notes." on public.promissory_notes
for select to authenticated using (true);
create policy "Authenticated users can create promissory notes." on public.promissory_notes
for insert to authenticated with check (true);
create policy "Authenticated users can update promissory notes." on public.promissory_notes
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view promissory installments." on public.promissory_installments;
drop policy if exists "Authenticated users can create promissory installments." on public.promissory_installments;
drop policy if exists "Authenticated users can update promissory installments." on public.promissory_installments;
create policy "Authenticated users can view promissory installments." on public.promissory_installments
for select to authenticated using (true);
create policy "Authenticated users can create promissory installments." on public.promissory_installments
for insert to authenticated with check (true);
create policy "Authenticated users can update promissory installments." on public.promissory_installments
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view cash movements." on public.cash_movements;
drop policy if exists "Authenticated users can create cash movements." on public.cash_movements;
create policy "Authenticated users can view cash movements." on public.cash_movements
for select to authenticated using (true);
create policy "Authenticated users can create cash movements." on public.cash_movements
for insert to authenticated with check (true);

drop policy if exists "Authenticated users can view customers." on public.customers;
drop policy if exists "Authenticated users can create customers." on public.customers;
drop policy if exists "Authenticated users can update customers." on public.customers;
drop policy if exists "Authenticated users can delete customers." on public.customers;
create policy "Authenticated users can view customers." on public.customers
for select to authenticated using (true);
create policy "Authenticated users can create customers." on public.customers
for insert to authenticated with check (true);
create policy "Authenticated users can update customers." on public.customers
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete customers." on public.customers
for delete to authenticated using (true);

drop policy if exists "Authenticated users can view cash sessions." on public.cash_sessions;
drop policy if exists "Authenticated users can create cash sessions." on public.cash_sessions;
drop policy if exists "Authenticated users can update cash sessions." on public.cash_sessions;
create policy "Authenticated users can view cash sessions." on public.cash_sessions
for select to authenticated using (true);
create policy "Authenticated users can create cash sessions." on public.cash_sessions
for insert to authenticated with check (true);
create policy "Authenticated users can update cash sessions." on public.cash_sessions
for update to authenticated using (true) with check (true);

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

drop trigger if exists product_models_set_updated_at on public.product_models;
create trigger product_models_set_updated_at before update on public.product_models
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

drop trigger if exists promissory_notes_set_updated_at on public.promissory_notes;
create trigger promissory_notes_set_updated_at before update on public.promissory_notes
for each row execute function public.set_updated_at();

drop trigger if exists promissory_installments_set_updated_at on public.promissory_installments;
create trigger promissory_installments_set_updated_at before update on public.promissory_installments
for each row execute function public.set_updated_at();

drop trigger if exists cash_movements_set_updated_at on public.cash_movements;
create trigger cash_movements_set_updated_at before update on public.cash_movements
for each row execute function public.set_updated_at();

drop trigger if exists cash_movements_set_code on public.cash_movements;
create trigger cash_movements_set_code before insert on public.cash_movements
for each row execute function public.set_cash_movement_code();

drop trigger if exists cash_sessions_set_updated_at on public.cash_sessions;
create trigger cash_sessions_set_updated_at before update on public.cash_sessions
for each row execute function public.set_updated_at();

create index if not exists products_barcode_idx on public.products (barcode);
create unique index if not exists product_models_reference_key on public.product_models (lower(reference)) where reference is not null and trim(reference) <> '';
create index if not exists product_models_brand_id_idx on public.product_models (brand_id);
create index if not exists product_models_category_id_idx on public.product_models (category_id);
create index if not exists product_models_name_idx on public.product_models (name);
create index if not exists product_models_family_idx on public.product_models (family);
create index if not exists products_product_model_id_idx on public.products (product_model_id);
create index if not exists products_reference_idx on public.products (reference);
create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_clothing_type_id_idx on public.products (clothing_type_id);
create index if not exists products_size_id_idx on public.products (size_id);
create index if not exists products_color_id_idx on public.products (color_id);
create index if not exists products_active_idx on public.products (active);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);
create index if not exists sale_payments_sale_id_idx on public.sale_payments (sale_id);
create unique index if not exists sale_payments_cash_movement_id_key on public.sale_payments (cash_movement_id);
create index if not exists promissory_notes_sale_id_idx on public.promissory_notes (sale_id);
create index if not exists promissory_notes_customer_id_idx on public.promissory_notes (customer_id);
create index if not exists promissory_notes_status_idx on public.promissory_notes (status);
create unique index if not exists promissory_notes_sale_id_key on public.promissory_notes (sale_id);
create index if not exists promissory_installments_note_id_idx on public.promissory_installments (promissory_note_id);
create index if not exists promissory_installments_due_date_idx on public.promissory_installments (due_date);
create index if not exists promissory_installments_status_idx on public.promissory_installments (status);
create unique index if not exists promissory_installments_cash_movement_id_key on public.promissory_installments (cash_movement_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists stock_movements_sale_id_idx on public.stock_movements (sale_id);
create index if not exists stock_movements_cash_movement_id_idx on public.stock_movements (cash_movement_id);
create index if not exists cash_movements_movement_date_idx on public.cash_movements (movement_date);
create index if not exists cash_movements_type_idx on public.cash_movements (type);
create index if not exists cash_movements_origin_idx on public.cash_movements (origin);
create index if not exists cash_movements_cash_session_id_idx on public.cash_movements (cash_session_id);
create index if not exists cash_movements_sale_payment_id_idx on public.cash_movements (sale_payment_id);
create unique index if not exists cash_movements_movement_code_key on public.cash_movements (movement_code);
create unique index if not exists cash_sessions_one_open_per_day_idx on public.cash_sessions (session_date) where status = 'open';
grant execute on function public.admin_delete_product_with_pin(uuid, text, uuid) to authenticated;

insert into public.sale_payments (
  sale_id,
  source_kind,
  payment_method,
  amount,
  installments_count,
  installment_value
)
select
  s.id,
  case
    when s.payment_method = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then 'installment_group'
    when s.payment_method = 'promissoria' then 'promissory_group'
    else 'cash_total'
  end,
  s.payment_method,
  s.total_amount,
  greatest(1, coalesce(s.installments_count, 1)),
  case
    when s.payment_method = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then round((s.total_amount / greatest(s.installments_count, 1))::numeric, 2)
    when s.payment_method = 'promissoria' then round((s.total_amount / greatest(s.installments_count, 1))::numeric, 2)
    else s.total_amount
  end
from public.sales s
where not exists (
  select 1
  from public.sale_payments sp
  where sp.sale_id = s.id
);

update public.cash_movements cm
set sale_payment_id = sp.id
from public.sale_payments sp
where cm.sale_id = sp.sale_id
  and cm.sale_payment_id is null
  and cm.origin = 'sale';

update public.sale_payments sp
set cash_movement_id = cm.id
from public.cash_movements cm
where cm.sale_payment_id = sp.id
  and sp.cash_movement_id is null;

drop function if exists public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, jsonb);

create or replace function public.register_sale_with_cash_and_stock(
  p_items jsonb,
  p_payment_method text default null,
  p_installments_count integer default 1,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_cash_session_id uuid default null,
  p_customer_id uuid default null,
  p_payments jsonb default null,
  p_promissory_plan jsonb default null
)
returns table (
  sale_id uuid,
  cash_movement_id uuid,
  movement_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_cash_movement_id uuid;
  v_first_cash_movement_id uuid;
  v_movement_code text;
  v_first_movement_code text;
  v_sale_reference text;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_pricing_kind text;
  v_original_unit_price numeric(12, 2);
  v_installments_count integer;
  v_installment_value numeric(12, 2);
  v_stock integer;
  v_product_name text;
  v_payments jsonb;
  v_payment jsonb;
  v_payment_total numeric(12, 2) := 0;
  v_payment_method_value text;
  v_payment_source_kind text;
  v_payment_amount numeric(12, 2);
  v_payment_installments_count integer;
  v_payment_installment_value numeric(12, 2);
  v_first_payment_method text;
  v_first_payment_installments integer;
  v_has_mixed_payment_method boolean := false;
  v_has_promissory_payment boolean := false;
  v_has_non_promissory_payment boolean := false;
  v_summary_payment_method text;
  v_summary_installments_count integer := 1;
  v_sale_payment_id uuid;
  v_promissory_note_id uuid;
  v_promissory_installments_count integer := 1;
  v_promissory_interval_days integer := 30;
  v_promissory_first_due_date date;
  v_promissory_entry_amount numeric(12, 2) := 0;
  v_promissory_notes text;
  v_promissory_installment_amount numeric(12, 2);
  v_installment_number integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto para registrar a venda.';
  end if;

  if p_customer_id is not null then
    perform 1 from public.customers where id = p_customer_id;

    if not found then
      raise exception 'Cliente não encontrado.';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(trim(coalesce(v_item->>'product_id', '')), '')::uuid;
    v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 0));
    v_unit_price := round(coalesce((v_item->>'unit_price')::numeric, 0), 2);
    v_pricing_kind := coalesce(nullif(trim(coalesce(v_item->>'pricing_kind', '')), ''), 'cash');
    v_original_unit_price := round(coalesce((v_item->>'original_unit_price')::numeric, v_unit_price), 2);
    v_installments_count := greatest(1, coalesce((v_item->>'installments_count')::integer, 1));
    v_installment_value := round(
      coalesce((v_item->>'installment_value')::numeric, (v_unit_price * v_quantity) / greatest(v_installments_count, 1)),
      2
    );

    if v_pricing_kind not in ('cash', 'installment') then
      raise exception 'Condição comercial inválida.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    if v_unit_price < 0 or v_original_unit_price < 0 or v_installment_value < 0 then
      raise exception 'Valores inválidos do item.';
    end if;

    if v_pricing_kind = 'installment' and v_installments_count < 2 then
      raise exception 'Itens parcelados precisam de ao menos 2 parcelas.';
    end if;

    select name, stock_quantity
    into v_product_name, v_stock
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'Produto não encontrado.';
    end if;

    if v_stock < v_quantity then
      raise exception 'Estoque insuficiente para %.', v_product_name;
    end if;

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  if p_promissory_plan is not null then
    if p_customer_id is null then
      raise exception 'Informe um cliente para vendas com promissória.';
    end if;

    v_promissory_installments_count := greatest(1, coalesce((p_promissory_plan->>'installments_count')::integer, 1));
    v_promissory_interval_days := greatest(1, coalesce((p_promissory_plan->>'interval_days')::integer, 30));
    v_promissory_entry_amount := greatest(0, round(coalesce((p_promissory_plan->>'entry_amount')::numeric, 0), 2));

    if v_promissory_entry_amount >= v_total then
      raise exception 'A entrada precisa ser menor que o total da venda.';
    end if;

    if v_promissory_entry_amount > 0 and v_promissory_installments_count < 2 then
      raise exception 'Com entrada, use ao menos 2 parcelas.';
    end if;

    v_promissory_first_due_date := coalesce(
      nullif(trim(coalesce(p_promissory_plan->>'first_due_date', '')), '')::date,
      coalesce(p_movement_date, current_date) + v_promissory_interval_days
    );
    v_promissory_notes := nullif(trim(coalesce(p_promissory_plan->>'notes', '')), '');
  end if;

  v_payments := p_payments;

  if v_payments is null or jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments) = 0 then
    if p_promissory_plan is not null then
      v_payments := jsonb_build_array(
        jsonb_build_object(
          'source_kind', 'promissory_group',
          'payment_method', 'promissoria',
          'amount', v_total,
          'installments_count', v_promissory_installments_count,
          'installment_value', case
            when v_promissory_entry_amount > 0 then v_promissory_entry_amount
            else round((v_total / greatest(1, v_promissory_installments_count))::numeric, 2)
          end
        )
      );
    else
      if p_payment_method is null then
        raise exception 'Informe ao menos uma forma de recebimento.';
      end if;

      if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria') then
        raise exception 'Forma de pagamento inválida.';
      end if;

      if p_payment_method = 'promissoria' then
        raise exception 'Use a configuração de promissória para definir os períodos.';
      end if;

      if p_installments_count is null or p_installments_count < 1 then
        raise exception 'Quantidade de parcelas inválida.';
      end if;

      v_payments := jsonb_build_array(
        jsonb_build_object(
          'source_kind', 'cash_total',
          'payment_method', p_payment_method,
          'amount', v_total,
          'installments_count', greatest(1, p_installments_count),
          'installment_value', round((v_total / greatest(1, p_installments_count))::numeric, 2)
        )
      );
    end if;
  end if;

  for v_payment in select * from jsonb_array_elements(v_payments)
  loop
    v_payment_source_kind := coalesce(nullif(trim(coalesce(v_payment->>'source_kind', '')), ''), 'cash_total');
    v_payment_method_value := v_payment->>'payment_method';
    v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
    v_payment_installments_count := greatest(1, coalesce((v_payment->>'installments_count')::integer, 1));
    v_payment_installment_value := round(
      coalesce((v_payment->>'installment_value')::numeric, v_payment_amount / greatest(v_payment_installments_count, 1)),
      2
    );

    if v_payment_method_value not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria') then
      raise exception 'Forma de pagamento inválida.';
    end if;

    if v_payment_source_kind not in ('cash_total', 'installment_group', 'promissory_group') then
      raise exception 'Origem de recebimento inválida.';
    end if;

    if v_payment_amount <= 0 then
      raise exception 'Informe valores válidos para os recebimentos.';
    end if;

    if v_payment_source_kind = 'promissory_group' then
      if p_promissory_plan is null then
        raise exception 'Informe a configuração da promissória antes de finalizar.';
      end if;

      if v_payment_method_value <> 'promissoria' then
        raise exception 'A promissória precisa ser recebida como promissória.';
      end if;
    elsif v_payment_source_kind = 'installment_group'
       and (v_payment_method_value <> 'cartao_credito' or v_payment_installments_count < 2) then
      raise exception 'Os itens parcelados precisam ser recebidos no crédito parcelado.';
    end if;

    if v_payment_source_kind = 'promissory_group' then
      v_has_promissory_payment := true;
    else
      v_has_non_promissory_payment := true;
    end if;

    v_payment_total := v_payment_total + v_payment_amount;

    if v_first_payment_method is null then
      v_first_payment_method := v_payment_method_value;
      v_first_payment_installments := v_payment_installments_count;
    elsif v_first_payment_method <> v_payment_method_value
      or v_first_payment_installments <> v_payment_installments_count then
      v_has_mixed_payment_method := true;
    end if;

    v_summary_installments_count := greatest(v_summary_installments_count, v_payment_installments_count);
  end loop;

  if abs(v_payment_total - v_total) > 0.01 then
    raise exception 'A soma dos recebimentos deve ser igual ao total da venda.';
  end if;

  if v_has_promissory_payment and v_has_non_promissory_payment then
    raise exception 'A promissória não pode ser combinada com outras formas de recebimento nesta versão.';
  end if;

  v_summary_payment_method := case
    when v_has_mixed_payment_method then 'outro'
    when v_has_promissory_payment then 'promissoria'
    else coalesce(v_first_payment_method, coalesce(p_payment_method, 'outro'))
  end;

  insert into public.sales (
    user_id,
    customer_id,
    total_amount,
    payment_method,
    installments_count,
    status,
    sale_date
  )
  values (
    coalesce(p_user_id, auth.uid()),
    p_customer_id,
    v_total,
    v_summary_payment_method,
    greatest(1, v_summary_installments_count),
    'finalizada',
    coalesce(p_movement_date, current_date)
  )
  returning id into v_sale_id;

  if v_has_promissory_payment then
    v_promissory_installment_amount := case
      when v_promissory_entry_amount > 0 then round((v_total - v_promissory_entry_amount) / greatest(v_promissory_installments_count - 1, 1)::numeric, 2)
      else round((v_total / greatest(1, v_promissory_installments_count))::numeric, 2)
    end;

    insert into public.promissory_notes (
      sale_id,
      customer_id,
      total_amount,
      installments_count,
      interval_days,
      first_due_date,
      status,
      notes
    )
    values (
      v_sale_id,
      p_customer_id,
      v_total,
      v_promissory_installments_count,
      v_promissory_interval_days,
      v_promissory_first_due_date,
      'open',
      v_promissory_notes
    )
    returning id into v_promissory_note_id;

    for v_installment_number in 1..v_promissory_installments_count loop
      insert into public.promissory_installments (
        promissory_note_id,
        installment_number,
        due_date,
        amount,
        status
      )
      values (
        v_promissory_note_id,
        v_installment_number,
        v_promissory_first_due_date + ((v_installment_number - 1) * v_promissory_interval_days),
        case
          when v_promissory_entry_amount > 0 and v_installment_number = 1
            then v_promissory_entry_amount
          when v_promissory_entry_amount > 0 and v_installment_number = v_promissory_installments_count
            then round((v_total - v_promissory_entry_amount - (v_promissory_installment_amount * (v_promissory_installments_count - 2)))::numeric, 2)
          when v_promissory_entry_amount = 0 and v_installment_number = v_promissory_installments_count
            then round((v_total - (v_promissory_installment_amount * (v_promissory_installments_count - 1)))::numeric, 2)
          else v_promissory_installment_amount
        end,
        'pending'
      );
    end loop;
  end if;

  v_sale_reference := 'VD-' || upper(substr(v_sale_id::text, 1, 8));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(trim(coalesce(v_item->>'product_id', '')), '')::uuid;
    v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 0));
    v_unit_price := round(coalesce((v_item->>'unit_price')::numeric, 0), 2);
    v_pricing_kind := coalesce(nullif(trim(coalesce(v_item->>'pricing_kind', '')), ''), 'cash');
    v_original_unit_price := round(coalesce((v_item->>'original_unit_price')::numeric, v_unit_price), 2);
    v_installments_count := greatest(1, coalesce((v_item->>'installments_count')::integer, 1));
    v_installment_value := round(
      coalesce((v_item->>'installment_value')::numeric, (v_unit_price * v_quantity) / greatest(v_installments_count, 1)),
      2
    );

    insert into public.sale_items (
      sale_id,
      product_id,
      quantity,
      pricing_kind,
      original_unit_price,
      unit_price,
      total_price,
      installments_count,
      installment_value
    )
    values (
      v_sale_id,
      v_product_id,
      v_quantity,
      v_pricing_kind,
      v_original_unit_price,
      v_unit_price,
      v_quantity * v_unit_price,
      v_installments_count,
      v_installment_value
    );

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product_id;

    insert into public.stock_movements (
      user_id,
      product_id,
      sale_id,
      type,
      reason,
      quantity,
      notes
    )
    values (
      coalesce(p_user_id, auth.uid()),
      v_product_id,
      v_sale_id,
      'saida',
      'venda',
      v_quantity,
      'Venda ' || coalesce(v_movement_code, v_sale_reference)
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(v_payments)
  loop
    v_payment_source_kind := coalesce(nullif(trim(coalesce(v_payment->>'source_kind', '')), ''), 'cash_total');
    v_payment_method_value := v_payment->>'payment_method';
    v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
    v_payment_installments_count := greatest(1, coalesce((v_payment->>'installments_count')::integer, 1));
    v_payment_installment_value := round(
      coalesce((v_payment->>'installment_value')::numeric, v_payment_amount / greatest(v_payment_installments_count, 1)),
      2
    );

    insert into public.sale_payments (
      sale_id,
      source_kind,
      payment_method,
      amount,
      installments_count,
      installment_value
    )
    values (
      v_sale_id,
      v_payment_source_kind,
      v_payment_method_value,
      v_payment_amount,
      v_payment_installments_count,
      v_payment_installment_value
    )
    returning id into v_sale_payment_id;

    if v_payment_source_kind <> 'promissory_group' then
      insert into public.cash_movements as cm (
        user_id,
        created_by,
        sale_id,
        sale_payment_id,
        cash_session_id,
        type,
        origin,
        description,
        amount,
        movement_date,
        payment_method,
        notes
      )
      values (
        coalesce(p_user_id, auth.uid()),
        auth.uid(),
        v_sale_id,
        v_sale_payment_id,
        p_cash_session_id,
        'income',
        'sale',
        'Venda',
        v_payment_amount,
        coalesce(p_movement_date, current_date),
        v_payment_method_value,
        p_notes
      )
      returning id, cm.movement_code
      into v_cash_movement_id, v_movement_code;

      update public.sale_payments
      set cash_movement_id = v_cash_movement_id
      where id = v_sale_payment_id;

      if v_first_cash_movement_id is null then
        v_first_cash_movement_id := v_cash_movement_id;
        v_first_movement_code := v_movement_code;
      end if;
    end if;
  end loop;

  update public.cash_movements cm
  set description = coalesce(
    (
      select string_agg(product_names.name, ', ' order by product_names.name)
      from (
        select distinct p.name
        from public.sale_items si
        join public.products p on p.id = si.product_id
        where si.sale_id = v_sale_id
      ) as product_names
    ),
    'Venda ' || coalesce(v_first_movement_code, v_sale_reference)
  )
  where cm.sale_id = v_sale_id
    and cm.origin = 'sale';

  return query
  select
    v_sale_id as sale_id,
    v_first_cash_movement_id as cash_movement_id,
    v_first_movement_code as movement_code;
end;
$$;

grant execute on function public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, jsonb) to authenticated;

create or replace function public.register_promissory_installment_payment_with_cash(
  p_installment_id uuid,
  p_payment_method text,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_cash_session_id uuid default null,
  p_confirmation_pin text default null
)
returns table (
  installment_id uuid,
  note_id uuid,
  cash_movement_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_installment record;
  v_customer_name text := 'Cliente';
  v_cash_movement_id uuid;
  v_movement_code text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_confirmation_pin is null or trim(p_confirmation_pin) = '' then
    raise exception 'Confirme a operação com o PIN antes de receber a promissória.';
  end if;

  if p_cash_session_id is null then
    raise exception 'Abra o caixa para receber a promissória.';
  end if;

  if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  select user_id, role
  into v_actor_user_id, v_actor_role
  from public.get_authenticated_user_by_pin(p_confirmation_pin, coalesce(p_user_id, auth.uid()));

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  select
    pi.id as installment_id,
    pi.promissory_note_id as note_id,
    pi.installment_number,
    pi.due_date,
    pi.amount,
    pi.status,
    pi.notes as installment_notes,
    pn.sale_id,
    pn.customer_id,
    pn.installments_count,
    pn.status as note_status
  into v_installment
  from public.promissory_installments pi
  join public.promissory_notes pn on pn.id = pi.promissory_note_id
  where pi.id = p_installment_id
  for update;

  if not found then
    raise exception 'Parcela não encontrada.';
  end if;

  if v_installment.status <> 'pending' then
    raise exception 'Esta parcela já foi recebida.';
  end if;

  if v_installment.note_status = 'cancelled' then
    raise exception 'Esta promissória foi cancelada.';
  end if;

  if v_installment.customer_id is not null then
    select coalesce(c.name, 'Cliente')
    into v_customer_name
    from public.customers c
    where c.id = v_installment.customer_id;
  end if;

  insert into public.cash_movements as cm (
    user_id,
    created_by,
    sale_id,
    cash_session_id,
    type,
    origin,
    description,
    amount,
    movement_date,
    payment_method,
    notes
  )
  values (
    v_actor_user_id,
    auth.uid(),
    v_installment.sale_id,
    p_cash_session_id,
    'income',
    'promissory',
    'Promissória ' || v_installment.installment_number || '/' || v_installment.installments_count || ' - ' || v_customer_name,
    v_installment.amount,
    coalesce(p_movement_date, current_date),
    p_payment_method,
    p_notes
  )
  returning id, cm.movement_code
  into v_cash_movement_id, v_movement_code;

  update public.promissory_installments
  set
    status = 'paid',
    paid_at = now(),
    payment_method = p_payment_method,
    cash_movement_id = v_cash_movement_id,
    notes = coalesce(p_notes, notes)
  where id = v_installment.installment_id;

  update public.promissory_notes
  set status = case
    when exists (
      select 1
      from public.promissory_installments
      where promissory_note_id = v_installment.note_id
        and status <> 'paid'
    ) then 'open'
    else 'paid'
  end
  where id = v_installment.note_id;

  return query
  select
    v_installment.installment_id as installment_id,
    v_installment.note_id as note_id,
    v_cash_movement_id as cash_movement_id;
end;
$$;

grant execute on function public.register_promissory_installment_payment_with_cash(uuid, text, date, text, uuid, uuid, text) to authenticated;

create or replace function public.get_sales_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language sql
stable
as $$
  select coalesce(sum(total_amount), 0)
  from public.sales
  where status = 'finalizada'
    and (p_start_date is null or sale_date::date >= p_start_date)
    and (p_end_date is null or sale_date::date < p_end_date)
$$;

create or replace function public.get_cash_expense_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.cash_movements
  where type = 'expense'
    and (p_start_date is null or movement_date >= p_start_date)
    and (p_end_date is null or movement_date < p_end_date)
$$;

-- Registro interno de atividade real do sistema para estimar pausa e última ação.
create table if not exists public.app_activity (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  source_table text,
  record_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_activity enable row level security;

create index if not exists app_activity_created_at_idx on public.app_activity (created_at desc);
create index if not exists app_activity_activity_type_idx on public.app_activity (activity_type);

drop function if exists public.record_app_activity(text, text, uuid, uuid, jsonb);
create or replace function public.record_app_activity(
  p_activity_type text,
  p_source_table text default null,
  p_record_id uuid default null,
  p_actor_user_id uuid default auth.uid(),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_activity (
    activity_type,
    source_table,
    record_id,
    actor_user_id,
    metadata
  )
  values (
    trim(coalesce(p_activity_type, '')),
    nullif(trim(coalesce(p_source_table, '')), ''),
    p_record_id,
    p_actor_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.touch_app_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_type text;
  v_actor_user_id uuid;
  v_record_id uuid;
begin
  v_record_id := new.id;

  if tg_table_name = 'cash_movements' then
    v_actor_user_id := coalesce(new.created_by_user_id, new.user_id, new.created_by, auth.uid());
  elsif tg_table_name = 'sales' then
    v_actor_user_id := coalesce(new.created_by_user_id, new.user_id, auth.uid());
  else
    v_actor_user_id := coalesce(new.user_id, auth.uid());
  end if;

  if tg_table_name = 'products' then
    v_activity_type := case when tg_op = 'INSERT' then 'product_create' else 'product_update' end;
  elsif tg_table_name = 'customers' then
    v_activity_type := case when tg_op = 'INSERT' then 'customer_create' else 'customer_update' end;
  elsif tg_table_name = 'sales' then
    v_activity_type := case when tg_op = 'INSERT' then 'sale' else 'sale_update' end;
  elsif tg_table_name = 'stock_movements' then
    v_activity_type := case when tg_op = 'INSERT' then 'stock_movement' else 'stock_movement_update' end;
  elsif tg_table_name = 'cash_movements' then
    v_activity_type := case
      when tg_op = 'INSERT' and coalesce(new.type, '') = 'expense' then 'expense'
      when tg_op = 'INSERT' then 'cash_movement'
      when coalesce(new.type, '') = 'expense' then 'expense_update'
      else 'cash_movement_update'
    end;
  else
    v_activity_type := lower(tg_table_name) || '_' || lower(tg_op);
  end if;

  perform public.record_app_activity(
    v_activity_type,
    tg_table_name,
    v_record_id,
    v_actor_user_id,
    jsonb_build_object(
      'operation', tg_op,
      'table', tg_table_name
    )
  );

  return new;
end;
$$;

drop trigger if exists products_touch_app_activity on public.products;
create trigger products_touch_app_activity after insert or update on public.products
for each row execute function public.touch_app_activity();

drop trigger if exists customers_touch_app_activity on public.customers;
create trigger customers_touch_app_activity after insert or update on public.customers
for each row execute function public.touch_app_activity();

drop trigger if exists sales_touch_app_activity on public.sales;
create trigger sales_touch_app_activity after insert or update on public.sales
for each row execute function public.touch_app_activity();

drop trigger if exists stock_movements_touch_app_activity on public.stock_movements;
create trigger stock_movements_touch_app_activity after insert or update on public.stock_movements
for each row execute function public.touch_app_activity();

drop trigger if exists cash_movements_touch_app_activity on public.cash_movements;
create trigger cash_movements_touch_app_activity after insert or update on public.cash_movements
for each row execute function public.touch_app_activity();

create or replace function public.get_kmoda_storage_usage()
returns table (
  used_bytes bigint,
  used_mb numeric(12, 2),
  limit_mb numeric(12, 2),
  percent_used numeric(6, 2),
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with tracked_tables as (
    select to_regclass('public.app_activity') as rel
    union all select to_regclass('public.profiles')
    union all select to_regclass('public.categories')
    union all select to_regclass('public.brands')
    union all select to_regclass('public.clothing_types')
    union all select to_regclass('public.sizes')
    union all select to_regclass('public.colors')
    union all select to_regclass('public.product_models')
    union all select to_regclass('public.products')
    union all select to_regclass('public.customers')
    union all select to_regclass('public.sales')
    union all select to_regclass('public.sale_items')
    union all select to_regclass('public.stock_movements')
    union all select to_regclass('public.cash_movements')
    union all select to_regclass('public.cash_sessions')
  ),
  size_summary as (
    select coalesce(sum(pg_total_relation_size(rel)), 0)::bigint as used_bytes
    from tracked_tables
    where rel is not null
  ),
  metrics as (
    select
      used_bytes,
      round((used_bytes::numeric / 1024 / 1024), 2) as used_mb,
      250::numeric(12, 2) as limit_mb
    from size_summary
  )
  select
    used_bytes,
    used_mb,
    limit_mb,
    round((used_mb / limit_mb) * 100, 2) as percent_used,
    case
      when (used_mb / limit_mb) * 100 <= 60 then 'normal'
      when (used_mb / limit_mb) * 100 <= 75 then 'attention'
      when (used_mb / limit_mb) * 100 <= 90 then 'warning'
      else 'critical'
    end as status
  from metrics;
$$;

drop function if exists public.get_app_pause_risk();
create or replace function public.get_app_pause_risk()
returns table (
  last_activity_at timestamptz,
  estimated_pause_at timestamptz,
  estimated_days_until_pause numeric(10, 2),
  pause_risk text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  select max(created_at)
  into last_activity_at
  from public.app_activity;

  if last_activity_at is null then
    estimated_pause_at := null;
    estimated_days_until_pause := null;
    pause_risk := 'crítico';
  else
    estimated_pause_at := last_activity_at + interval '7 days';
    estimated_days_until_pause := round(
      greatest(extract(epoch from (estimated_pause_at - now())) / 86400.0, 0)::numeric,
      2
    );

    pause_risk := case
      when estimated_days_until_pause > 4 then 'baixo'
      when estimated_days_until_pause > 2 then 'médio'
      when estimated_days_until_pause >= 1 then 'alto'
      else 'crítico'
    end;
  end if;

  return next;
end;
$$;

grant execute on function public.record_app_activity(text, text, uuid, uuid, jsonb) to authenticated;
grant execute on function public.get_kmoda_storage_usage() to authenticated;
grant execute on function public.get_app_pause_risk() to authenticated;
