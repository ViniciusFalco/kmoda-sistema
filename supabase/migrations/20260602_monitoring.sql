-- Monitoramento interno do Kmoda para uso de espaço e risco de pausa.
-- Execute este arquivo no SQL Editor do Supabase após as migrações base.

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
    v_actor_user_id := coalesce(new.user_id, new.created_by, auth.uid());
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
