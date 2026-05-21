-- Refatoração de produtos em modelo base + variações por código.
-- Execute após as migrações anteriores para preservar vendas, estoque e caixa.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

alter table public.products add column if not exists product_model_id uuid references public.product_models(id) on delete set null;

alter table public.product_models enable row level security;
alter table public.products enable row level security;

drop policy if exists "Authenticated users can view product models." on public.product_models;
drop policy if exists "Authenticated users can create product models." on public.product_models;
drop policy if exists "Authenticated users can update product models." on public.product_models;
drop policy if exists "Authenticated users can delete product models." on public.product_models;

create policy "Authenticated users can view product models."
on public.product_models for select
to authenticated
using (true);

create policy "Authenticated users can create product models."
on public.product_models for insert
to authenticated
with check (true);

create policy "Authenticated users can update product models."
on public.product_models for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete product models."
on public.product_models for delete
to authenticated
using (true);

create unique index if not exists product_models_reference_key
  on public.product_models (lower(reference))
  where reference is not null and trim(reference) <> '';

create index if not exists product_models_brand_id_idx on public.product_models (brand_id);
create index if not exists product_models_category_id_idx on public.product_models (category_id);
create index if not exists product_models_name_idx on public.product_models (name);
create index if not exists product_models_family_idx on public.product_models (family);
create index if not exists products_product_model_id_idx on public.products (product_model_id);

do $$
begin
  -- Consolida modelos com referência já existente.
  insert into public.product_models (
    user_id,
    reference,
    name,
    family,
    brand_id,
    category_id,
    created_at,
    updated_at
  )
  select distinct on (lower(trim(p.reference)))
    p.user_id,
    trim(p.reference),
    p.name,
    coalesce(nullif(trim(ct.name), ''), nullif(trim(p.name), '')),
    p.brand_id,
    p.clothing_type_id,
    p.created_at,
    p.updated_at
  from public.products p
  left join public.clothing_types ct on ct.id = p.clothing_type_id
  where p.product_model_id is null
    and p.reference is not null
    and trim(p.reference) <> ''
  order by lower(trim(p.reference)), p.created_at asc;

  update public.products p
  set product_model_id = m.id
  from public.product_models m
  where p.product_model_id is null
    and p.reference is not null
    and trim(p.reference) <> ''
    and lower(trim(p.reference)) = lower(trim(coalesce(m.reference, '')));

  -- Garante um modelo para produtos antigos sem referência.
  insert into public.product_models (
    user_id,
    reference,
    name,
    family,
    brand_id,
    category_id,
    created_at,
    updated_at
  )
  select
    p.user_id,
    'LEGACY-' || p.id::text,
    p.name,
    coalesce(nullif(trim(ct.name), ''), nullif(trim(p.name), '')),
    p.brand_id,
    p.clothing_type_id,
    p.created_at,
    p.updated_at
  from public.products p
  left join public.clothing_types ct on ct.id = p.clothing_type_id
  where p.product_model_id is null;

  update public.products p
  set product_model_id = m.id
  from public.product_models m
  where p.product_model_id is null
    and m.reference = 'LEGACY-' || p.id::text;

  -- Sincroniza os campos legados com o modelo base.
  update public.products p
  set
    name = m.name,
    reference = m.reference,
    brand_id = m.brand_id,
    clothing_type_id = m.category_id
  from public.product_models m
  where p.product_model_id = m.id;
end $$;

drop trigger if exists product_models_set_updated_at on public.product_models;
create trigger product_models_set_updated_at before update on public.product_models
for each row execute function public.set_updated_at();

