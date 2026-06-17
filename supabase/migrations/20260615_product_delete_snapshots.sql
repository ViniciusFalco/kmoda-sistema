create extension if not exists "pgcrypto" schema extensions;

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

alter table public.sale_items add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
alter table public.sale_items alter column product_id drop not null;
alter table public.sale_items drop constraint if exists sale_items_product_id_fkey;
alter table public.sale_items
add constraint sale_items_product_id_fkey
foreign key (product_id) references public.products(id) on delete set null;

alter table public.stock_movements add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
alter table public.stock_movements alter column product_id drop not null;
alter table public.stock_movements drop constraint if exists stock_movements_product_id_fkey;
alter table public.stock_movements
add constraint stock_movements_product_id_fkey
foreign key (product_id) references public.products(id) on delete set null;

update public.sale_items si
set product_snapshot = public.build_product_snapshot(si.product_id)
where si.product_id is not null
  and coalesce(si.product_snapshot, '{}'::jsonb) = '{}'::jsonb;

update public.stock_movements sm
set product_snapshot = public.build_product_snapshot(sm.product_id)
where sm.product_id is not null
  and coalesce(sm.product_snapshot, '{}'::jsonb) = '{}'::jsonb;

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

create index if not exists sale_items_product_id_idx on public.sale_items (product_id);

grant execute on function public.admin_delete_product_with_pin(uuid, text, uuid) to authenticated;
