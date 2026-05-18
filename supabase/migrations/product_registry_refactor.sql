-- Migração segura para transformar produtos em cadastro por marca/tipo/tamanho/cor.
-- Execute no SQL Editor do Supabase. Não remove colunas antigas.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clothing_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'brand'
  ) then
    execute $sql$
      insert into public.brands (name)
      select distinct trim(brand)
      from public.products
      where brand is not null and trim(brand) <> ''
        and not exists (select 1 from public.brands b where lower(b.name) = lower(trim(brand)))
    $sql$;

    execute $sql$
      update public.products p
      set brand_id = b.id
      from public.brands b
      where p.brand_id is null and trim(p.brand) = b.name
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'size'
  ) then
    execute $sql$
      insert into public.sizes (name)
      select distinct trim(size)
      from public.products
      where size is not null and trim(size) <> ''
        and not exists (select 1 from public.sizes s where lower(s.name) = lower(trim(size)))
    $sql$;

    execute $sql$
      update public.products p
      set size_id = s.id
      from public.sizes s
      where p.size_id is null and trim(p.size) = s.name
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'color'
  ) then
    execute $sql$
      insert into public.colors (name)
      select distinct trim(color)
      from public.products
      where color is not null and trim(color) <> ''
        and not exists (select 1 from public.colors c where lower(c.name) = lower(trim(color)))
    $sql$;

    execute $sql$
      update public.products p
      set color_id = c.id
      from public.colors c
      where p.color_id is null and trim(p.color) = c.name
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'category_id'
  ) then
    execute $sql$
      insert into public.clothing_types (name, description)
      select distinct c.name, c.description
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.category_id is not null
        and not exists (select 1 from public.clothing_types ct where lower(ct.name) = lower(c.name))
    $sql$;

    execute $sql$
      update public.products p
      set clothing_type_id = ct.id
      from public.categories c
      join public.clothing_types ct on ct.name = c.name
      where p.clothing_type_id is null and p.category_id = c.id
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'status'
  ) then
    execute $sql$
      update public.products
      set active = case when status = 'inactive' then false else true end
    $sql$;
  end if;
end $$;

alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements
add constraint stock_movements_reason_check
check (reason in ('cadastro_inicial', 'compra', 'venda', 'ajuste_manual', 'troca', 'perda'));

alter table public.brands enable row level security;
alter table public.clothing_types enable row level security;
alter table public.sizes enable row level security;
alter table public.colors enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "Authenticated users can view brands." on public.brands;
drop policy if exists "Authenticated users can create brands." on public.brands;
drop policy if exists "Authenticated users can update brands." on public.brands;
drop policy if exists "Authenticated users can delete brands." on public.brands;
create policy "Authenticated users can view brands." on public.brands for select to authenticated using (true);
create policy "Authenticated users can create brands." on public.brands for insert to authenticated with check (true);
create policy "Authenticated users can update brands." on public.brands for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete brands." on public.brands for delete to authenticated using (true);

drop policy if exists "Authenticated users can view clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can create clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can update clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can delete clothing types." on public.clothing_types;
create policy "Authenticated users can view clothing types." on public.clothing_types for select to authenticated using (true);
create policy "Authenticated users can create clothing types." on public.clothing_types for insert to authenticated with check (true);
create policy "Authenticated users can update clothing types." on public.clothing_types for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete clothing types." on public.clothing_types for delete to authenticated using (true);

drop policy if exists "Authenticated users can view sizes." on public.sizes;
drop policy if exists "Authenticated users can create sizes." on public.sizes;
drop policy if exists "Authenticated users can update sizes." on public.sizes;
drop policy if exists "Authenticated users can delete sizes." on public.sizes;
create policy "Authenticated users can view sizes." on public.sizes for select to authenticated using (true);
create policy "Authenticated users can create sizes." on public.sizes for insert to authenticated with check (true);
create policy "Authenticated users can update sizes." on public.sizes for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete sizes." on public.sizes for delete to authenticated using (true);

drop policy if exists "Authenticated users can view colors." on public.colors;
drop policy if exists "Authenticated users can create colors." on public.colors;
drop policy if exists "Authenticated users can update colors." on public.colors;
drop policy if exists "Authenticated users can delete colors." on public.colors;
create policy "Authenticated users can view colors." on public.colors for select to authenticated using (true);
create policy "Authenticated users can create colors." on public.colors for insert to authenticated with check (true);
create policy "Authenticated users can update colors." on public.colors for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete colors." on public.colors for delete to authenticated using (true);

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

create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_clothing_type_id_idx on public.products (clothing_type_id);
create index if not exists products_size_id_idx on public.products (size_id);
create index if not exists products_color_id_idx on public.products (color_id);
create index if not exists products_active_idx on public.products (active);
