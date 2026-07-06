create extension if not exists "pgcrypto" schema extensions;

-- Perfis PIN e status ativo.
alter table public.profiles add column if not exists pin_hash text;
alter table public.profiles add column if not exists active boolean not null default true;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'cashier', 'operator'));

create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = coalesce(p_user_id, auth.uid())
      and p.active = true
      and p.role = 'admin'
  )
$$;

create or replace function public.get_profile_by_pin(p_pin text)
returns table (
  user_id uuid,
  name text,
  role text,
  active boolean,
  auth_email text
)
language plpgsql
security definer
stable
set search_path = public, auth, extensions
as $$
declare
  v_match_count integer;
begin
  select count(*)
  into v_match_count
  from public.profiles p
  where p.active = true
    and p.pin_hash is not null
    and extensions.crypt(trim(coalesce(p_pin, '')), p.pin_hash) = p.pin_hash;

  if v_match_count > 1 then
    raise exception 'PIN duplicado. Ajuste o cadastro dos usuários.';
  end if;

  return query
  select
    p.user_id,
    p.name,
    p.role,
    p.active,
    u.email::text as auth_email
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.active = true
    and p.pin_hash is not null
    and extensions.crypt(trim(coalesce(p_pin, '')), p.pin_hash) = p.pin_hash
  limit 1;
end;
$$;

create or replace function public.get_authenticated_user_by_pin(
  p_pin text,
  p_expected_user_id uuid default null
)
returns table (
  user_id uuid,
  name text,
  role text
)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
begin
  return query
  select p.user_id, p.name, p.role
  from public.profiles p
  where p.active = true
    and (p_expected_user_id is null or p.user_id = p_expected_user_id)
    and p.pin_hash is not null
    and extensions.crypt(trim(coalesce(p_pin, '')), p.pin_hash) = p.pin_hash
  limit 1;
end;
$$;

create or replace function public.set_my_pin(
  p_pin text,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if v_user_id is null or v_user_id <> auth.uid() then
    raise exception 'Não é permitido alterar o PIN de outro usuário.';
  end if;

  if p_pin is null or trim(p_pin) !~ '^[0-9]{6}$' then
    raise exception 'O PIN precisa ter 6 dígitos.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.user_id <> v_user_id
      and p.active = true
      and p.pin_hash is not null
      and extensions.crypt(trim(p_pin), p.pin_hash) = p.pin_hash
  ) then
    raise exception 'Já existe um outro usuário ativo com este PIN.';
  end if;

  v_hash := extensions.crypt(trim(p_pin), extensions.gen_salt('bf'));

  update public.profiles
  set pin_hash = v_hash,
      updated_at = now()
  where user_id = v_user_id;

  update auth.users
  set encrypted_password = v_hash
  where id = v_user_id;
end;
$$;

grant execute on function public.get_profile_by_pin(text) to anon, authenticated;
grant execute on function public.get_authenticated_user_by_pin(text, uuid) to authenticated;
grant execute on function public.set_my_pin(text, uuid) to authenticated;
grant execute on function public.is_admin_user(uuid) to authenticated;

create or replace function public.admin_list_user_accounts()
returns table (
  user_id uuid,
  email text,
  name text,
  role text,
  active boolean,
  pin_configured boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Acesso restrito.';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(p.name, '') as name,
    coalesce(p.role, 'operator') as role,
    coalesce(p.active, true) as active,
    p.pin_hash is not null as pin_configured,
    coalesce(p.created_at, u.created_at) as created_at,
    coalesce(p.updated_at, u.updated_at) as updated_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by coalesce(p.updated_at, u.updated_at) desc, u.created_at desc;
end;
$$;

create or replace function public.admin_find_user_by_email(p_email text)
returns table (
  user_id uuid,
  email text,
  name text,
  role text,
  active boolean,
  pin_configured boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Acesso restrito.';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(p.name, '') as name,
    coalesce(p.role, 'operator') as role,
    coalesce(p.active, true) as active,
    p.pin_hash is not null as pin_configured,
    coalesce(p.created_at, u.created_at) as created_at,
    coalesce(p.updated_at, u.updated_at) as updated_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where lower(u.email) = lower(trim(coalesce(p_email, '')))
  limit 1;
end;
$$;

create or replace function public.admin_upsert_user_profile(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Acesso restrito.';
  end if;

  if p_user_id is null then
    raise exception 'Usuário inválido.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Informe o nome interno do usuário.';
  end if;

  if p_role not in ('admin', 'cashier', 'operator') then
    raise exception 'Perfil inválido.';
  end if;

  insert into public.profiles (user_id, name, role, active)
  values (p_user_id, trim(p_name), p_role, coalesce(p_active, true))
  on conflict (user_id) do update
  set name = excluded.name,
      role = excluded.role,
      active = excluded.active,
      updated_at = now();
end;
$$;

grant execute on function public.admin_list_user_accounts() to authenticated;
grant execute on function public.admin_find_user_by_email(text) to authenticated;
grant execute on function public.admin_upsert_user_profile(uuid, text, text, boolean) to authenticated;

-- Auditoria nas vendas e no caixa.
alter table public.sales add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;
alter table public.sales add column if not exists created_by_name text;
alter table public.sales add column if not exists created_by_role text;
alter table public.sales add column if not exists confirmed_with_pin_at timestamptz;

alter table public.cash_movements add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;
alter table public.cash_movements add column if not exists created_by_name text;
alter table public.cash_movements add column if not exists created_by_role text;
alter table public.cash_movements add column if not exists confirmed_with_pin_at timestamptz;

update public.sales s
set created_by_user_id = coalesce(s.created_by_user_id, s.user_id),
    created_by_name = coalesce(s.created_by_name, p.name),
    created_by_role = coalesce(s.created_by_role, p.role)
from public.profiles p
where p.user_id = coalesce(s.created_by_user_id, s.user_id)
  and (s.created_by_user_id is null or s.created_by_name is null or s.created_by_role is null);

update public.cash_movements cm
set created_by_user_id = coalesce(cm.created_by_user_id, cm.created_by, cm.user_id),
    created_by_name = coalesce(cm.created_by_name, p.name),
    created_by_role = coalesce(cm.created_by_role, p.role)
from public.profiles p
where p.user_id = coalesce(cm.created_by_user_id, cm.created_by, cm.user_id)
  and (cm.created_by_user_id is null or cm.created_by_name is null or cm.created_by_role is null);

-- Regras de acesso por papel.
drop policy if exists "Admin users can create products." on public.products;
drop policy if exists "Admin users can update products." on public.products;
drop policy if exists "Admin users can delete products." on public.products;
drop policy if exists "Admin users can create product models." on public.product_models;
drop policy if exists "Admin users can update product models." on public.product_models;
drop policy if exists "Admin users can delete product models." on public.product_models;
drop policy if exists "Admin users can create categories." on public.categories;
drop policy if exists "Admin users can update categories." on public.categories;
drop policy if exists "Admin users can delete categories." on public.categories;
drop policy if exists "Admin users can create brands." on public.brands;
drop policy if exists "Admin users can update brands." on public.brands;
drop policy if exists "Admin users can delete brands." on public.brands;
drop policy if exists "Admin users can create clothing types." on public.clothing_types;
drop policy if exists "Admin users can update clothing types." on public.clothing_types;
drop policy if exists "Admin users can delete clothing types." on public.clothing_types;
drop policy if exists "Admin users can create sizes." on public.sizes;
drop policy if exists "Admin users can update sizes." on public.sizes;
drop policy if exists "Admin users can delete sizes." on public.sizes;
drop policy if exists "Admin users can create colors." on public.colors;
drop policy if exists "Admin users can update colors." on public.colors;
drop policy if exists "Admin users can delete colors." on public.colors;
drop policy if exists "Admin users can create customers." on public.customers;
drop policy if exists "Admin users can update customers." on public.customers;
drop policy if exists "Admin users can delete customers." on public.customers;
drop policy if exists "Admin users can create stock movements." on public.stock_movements;
drop policy if exists "Admin users can update stock movements." on public.stock_movements;
drop policy if exists "Admin users can delete stock movements." on public.stock_movements;
drop policy if exists "Admin users can create sales." on public.sales;
drop policy if exists "Admin users can update sales." on public.sales;
drop policy if exists "Admin users can delete sales." on public.sales;
drop policy if exists "Admin users can create sale items." on public.sale_items;
drop policy if exists "Admin users can update sale items." on public.sale_items;
drop policy if exists "Admin users can delete sale items." on public.sale_items;
drop policy if exists "Admin users can create sale payments." on public.sale_payments;
drop policy if exists "Admin users can update sale payments." on public.sale_payments;
drop policy if exists "Admin users can delete sale payments." on public.sale_payments;
drop policy if exists "Admin users can create cash movements." on public.cash_movements;
drop policy if exists "Admin users can update cash movements." on public.cash_movements;
drop policy if exists "Admin users can delete cash movements." on public.cash_movements;
drop policy if exists "Admin users can create cash sessions." on public.cash_sessions;
drop policy if exists "Admin users can update cash sessions." on public.cash_sessions;
drop policy if exists "Admin users can delete cash sessions." on public.cash_sessions;

drop policy if exists "Authenticated users can create products." on public.products;
drop policy if exists "Authenticated users can update products." on public.products;
drop policy if exists "Authenticated users can delete products." on public.products;
create policy "Admin users can create products." on public.products
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update products." on public.products
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete products." on public.products
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create product models." on public.product_models;
drop policy if exists "Authenticated users can update product models." on public.product_models;
drop policy if exists "Authenticated users can delete product models." on public.product_models;
create policy "Admin users can create product models." on public.product_models
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update product models." on public.product_models
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete product models." on public.product_models
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create categories." on public.categories;
drop policy if exists "Authenticated users can update categories." on public.categories;
drop policy if exists "Authenticated users can delete categories." on public.categories;
create policy "Admin users can create categories." on public.categories
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update categories." on public.categories
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete categories." on public.categories
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create brands." on public.brands;
drop policy if exists "Authenticated users can update brands." on public.brands;
drop policy if exists "Authenticated users can delete brands." on public.brands;
create policy "Admin users can create brands." on public.brands
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update brands." on public.brands
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete brands." on public.brands
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can update clothing types." on public.clothing_types;
drop policy if exists "Authenticated users can delete clothing types." on public.clothing_types;
create policy "Admin users can create clothing types." on public.clothing_types
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update clothing types." on public.clothing_types
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete clothing types." on public.clothing_types
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create sizes." on public.sizes;
drop policy if exists "Authenticated users can update sizes." on public.sizes;
drop policy if exists "Authenticated users can delete sizes." on public.sizes;
create policy "Admin users can create sizes." on public.sizes
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update sizes." on public.sizes
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete sizes." on public.sizes
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create colors." on public.colors;
drop policy if exists "Authenticated users can update colors." on public.colors;
drop policy if exists "Authenticated users can delete colors." on public.colors;
create policy "Admin users can create colors." on public.colors
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update colors." on public.colors
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete colors." on public.colors
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create customers." on public.customers;
drop policy if exists "Authenticated users can update customers." on public.customers;
drop policy if exists "Authenticated users can delete customers." on public.customers;
create policy "Admin users can create customers." on public.customers
for insert to authenticated
with check (public.is_admin_user());
create policy "Admin users can update customers." on public.customers
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
create policy "Admin users can delete customers." on public.customers
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create stock movements." on public.stock_movements;
create policy "Admin users can create stock movements." on public.stock_movements
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update stock movements." on public.stock_movements;
create policy "Admin users can update stock movements." on public.stock_movements
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete stock movements." on public.stock_movements;
create policy "Admin users can delete stock movements." on public.stock_movements
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create sales." on public.sales;
create policy "Admin users can create sales." on public.sales
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update sales." on public.sales;
create policy "Admin users can update sales." on public.sales
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete sales." on public.sales;
create policy "Admin users can delete sales." on public.sales
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create sale items." on public.sale_items;
create policy "Admin users can create sale items." on public.sale_items
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update sale items." on public.sale_items;
create policy "Admin users can update sale items." on public.sale_items
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete sale items." on public.sale_items;
create policy "Admin users can delete sale items." on public.sale_items
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create sale payments." on public.sale_payments;
create policy "Admin users can create sale payments." on public.sale_payments
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update sale payments." on public.sale_payments;
create policy "Admin users can update sale payments." on public.sale_payments
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete sale payments." on public.sale_payments;
create policy "Admin users can delete sale payments." on public.sale_payments
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create cash movements." on public.cash_movements;
create policy "Admin users can create cash movements." on public.cash_movements
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update cash movements." on public.cash_movements;
create policy "Admin users can update cash movements." on public.cash_movements
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete cash movements." on public.cash_movements;
create policy "Admin users can delete cash movements." on public.cash_movements
for delete to authenticated
using (public.is_admin_user());

drop policy if exists "Authenticated users can create cash sessions." on public.cash_sessions;
create policy "Admin users can create cash sessions." on public.cash_sessions
for insert to authenticated
with check (public.is_admin_user());
drop policy if exists "Authenticated users can update cash sessions." on public.cash_sessions;
create policy "Admin users can update cash sessions." on public.cash_sessions
for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
drop policy if exists "Authenticated users can delete cash sessions." on public.cash_sessions;
create policy "Admin users can delete cash sessions." on public.cash_sessions
for delete to authenticated
using (public.is_admin_user());

-- Atualiza activity para considerar a nova origem do operador.
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

-- RPCs com validação por PIN.
drop function if exists public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, text);
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
  p_confirmation_pin text default null
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
  v_summary_payment_method text;
  v_summary_installments_count integer := 1;
  v_sale_payment_id uuid;
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, name, role
  into v_actor_user_id, v_actor_name, v_actor_role
  from public.get_authenticated_user_by_pin(p_confirmation_pin);

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
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

  v_payments := p_payments;

  if v_payments is null or jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments) = 0 then
    if p_payment_method is null then
      raise exception 'Informe ao menos uma forma de recebimento.';
    end if;

    if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
      raise exception 'Forma de pagamento inválida.';
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

    if v_payment_method_value not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
      raise exception 'Forma de pagamento inválida.';
    end if;

    if v_payment_source_kind not in ('cash_total', 'installment_group') then
      raise exception 'Origem de recebimento inválida.';
    end if;

    if v_payment_amount <= 0 then
      raise exception 'Informe valores válidos para os recebimentos.';
    end if;

    if v_payment_source_kind = 'installment_group'
       and (v_payment_method_value <> 'cartao_credito' or v_payment_installments_count < 2) then
      raise exception 'Os itens parcelados precisam ser recebidos no crédito parcelado.';
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

  v_summary_payment_method := case
    when v_has_mixed_payment_method then 'outro'
    else coalesce(v_first_payment_method, coalesce(p_payment_method, 'outro'))
  end;

  insert into public.sales (
    user_id,
    created_by_user_id,
    created_by_name,
    created_by_role,
    confirmed_with_pin_at,
    customer_id,
    total_amount,
    payment_method,
    installments_count,
    status,
    sale_date
  )
  values (
    v_actor_user_id,
    v_actor_user_id,
    v_actor_name,
    v_actor_role,
    now(),
    p_customer_id,
    v_total,
    v_summary_payment_method,
    greatest(1, v_summary_installments_count),
    'finalizada',
    coalesce(p_movement_date, current_date)
  )
  returning id into v_sale_id;

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
      v_actor_user_id,
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

    insert into public.cash_movements as cm (
      user_id,
      created_by,
      created_by_user_id,
      created_by_name,
      created_by_role,
      confirmed_with_pin_at,
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
      v_actor_user_id,
      v_actor_user_id,
      v_actor_user_id,
      v_actor_name,
      v_actor_role,
      now(),
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

grant execute on function public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, text) to authenticated;

create or replace function public.register_cash_expense_with_pin(
  p_cash_session_id uuid,
  p_description text,
  p_amount numeric,
  p_movement_date date default current_date,
  p_payment_method text default null,
  p_notes text default null,
  p_pin text default null,
  p_user_id uuid default auth.uid()
)
returns table (
  cash_movement_id uuid,
  movement_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_role text;
  v_movement_code text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, name, role
  into v_actor_user_id, v_actor_name, v_actor_role
  from public.get_authenticated_user_by_pin(p_pin);

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  insert into public.cash_movements as cm (
    user_id,
    created_by,
    created_by_user_id,
    created_by_name,
    created_by_role,
    confirmed_with_pin_at,
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
    v_actor_user_id,
    v_actor_user_id,
    v_actor_name,
    v_actor_role,
    now(),
    p_cash_session_id,
    'expense',
    'manual_expense',
    trim(coalesce(p_description, '')),
    abs(coalesce(p_amount, 0)),
    coalesce(p_movement_date, current_date),
    p_payment_method,
    p_notes
  )
  returning id, cm.movement_code into cash_movement_id, v_movement_code;

  movement_code := v_movement_code;
  return next;
end;
$$;

create or replace function public.register_cash_income_with_pin(
  p_cash_session_id uuid,
  p_description text,
  p_amount numeric,
  p_movement_date date default current_date,
  p_payment_method text default null,
  p_notes text default null,
  p_pin text default null,
  p_user_id uuid default auth.uid()
)
returns table (
  cash_movement_id uuid,
  movement_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_role text;
  v_movement_code text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, name, role
  into v_actor_user_id, v_actor_name, v_actor_role
  from public.get_authenticated_user_by_pin(p_pin);

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  insert into public.cash_movements as cm (
    user_id,
    created_by,
    created_by_user_id,
    created_by_name,
    created_by_role,
    confirmed_with_pin_at,
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
    v_actor_user_id,
    v_actor_user_id,
    v_actor_name,
    v_actor_role,
    now(),
    p_cash_session_id,
    'income',
    'manual_income',
    trim(coalesce(p_description, '')),
    abs(coalesce(p_amount, 0)),
    coalesce(p_movement_date, current_date),
    p_payment_method,
    p_notes
  )
  returning id, cm.movement_code into cash_movement_id, v_movement_code;

  movement_code := v_movement_code;
  return next;
end;
$$;

create or replace function public.open_cash_session_with_pin(
  p_opening_amount numeric,
  p_notes text default null,
  p_pin text default null,
  p_user_id uuid default auth.uid()
)
returns table (
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, name, role
  into v_actor_user_id, v_actor_name, v_actor_role
  from public.get_authenticated_user_by_pin(p_pin);

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  insert into public.cash_sessions (
    session_date,
    opening_amount,
    status,
    opened_by,
    notes
  )
  values (
    current_date,
    coalesce(p_opening_amount, 0),
    'open',
    v_actor_user_id,
    p_notes
  )
  returning id into session_id;

  return next;
end;
$$;

create or replace function public.close_cash_session_with_pin(
  p_session_id uuid,
  p_closing_amount numeric,
  p_expected_amount numeric,
  p_difference_amount numeric,
  p_notes text default null,
  p_pin text default null,
  p_user_id uuid default auth.uid()
)
returns table (
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select user_id, name, role
  into v_actor_user_id, v_actor_name, v_actor_role
  from public.get_authenticated_user_by_pin(p_pin);

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  update public.cash_sessions
  set closing_amount = coalesce(p_closing_amount, 0),
      expected_amount = coalesce(p_expected_amount, 0),
      difference_amount = coalesce(p_difference_amount, 0),
      status = 'closed',
      closed_at = now(),
      closed_by = v_actor_user_id,
      notes = p_notes
  where id = p_session_id;

  session_id := p_session_id;
  return next;
end;
$$;

grant execute on function public.register_cash_expense_with_pin(uuid, text, numeric, date, text, text, text, uuid) to authenticated;
grant execute on function public.register_cash_income_with_pin(uuid, text, numeric, date, text, text, text, uuid) to authenticated;
grant execute on function public.open_cash_session_with_pin(numeric, text, text, uuid) to authenticated;
grant execute on function public.close_cash_session_with_pin(uuid, numeric, numeric, numeric, text, text, uuid) to authenticated;

-- Resumos administrativos restritos.
create or replace function public.get_sales_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Acesso restrito.';
  end if;

  return coalesce((
    select sum(total_amount)
    from public.sales
    where status = 'finalizada'
      and (p_start_date is null or sale_date::date >= p_start_date)
      and (p_end_date is null or sale_date::date < p_end_date)
  ), 0);
end;
$$;

create or replace function public.get_cash_expense_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Acesso restrito.';
  end if;

  return coalesce((
    select sum(amount)
    from public.cash_movements
    where type = 'expense'
      and (p_start_date is null or movement_date >= p_start_date)
      and (p_end_date is null or movement_date < p_end_date)
  ), 0);
end;
$$;
