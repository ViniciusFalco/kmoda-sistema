-- Refatoração do caixa: venda e gasto como fluxos principais.
-- Execute no SQL Editor do Supabase após a migration de cadastros/produtos.

create extension if not exists "pgcrypto";

create sequence if not exists public.cash_movement_code_seq;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.set_cash_movement_code()
returns trigger as $$
begin
  if new.movement_code is null or trim(new.movement_code) = '' then
    new.movement_code := 'CX-' || lpad(nextval('public.cash_movement_code_seq')::text, 6, '0');
  end if;

  return new;
end;
$$ language plpgsql;

alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sales
add constraint sales_payment_method_check
check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro'));

alter table public.cash_movements add column if not exists movement_code text;
alter table public.cash_movements add column if not exists origin text;
alter table public.cash_movements add column if not exists updated_at timestamptz not null default now();
alter table public.cash_movements add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.cash_movements drop constraint if exists cash_movements_type_check;
update public.cash_movements
set type = case
  when type = 'entrada' then 'income'
  when type = 'saida' then 'expense'
  else type
end;
alter table public.cash_movements
add constraint cash_movements_type_check
check (type in ('income', 'expense'));

update public.cash_movements
set origin = case
  when origin is not null then origin
  when sale_id is not null then 'sale'
  when type = 'income' then 'manual_income'
  else 'manual_expense'
end;

alter table public.cash_movements drop constraint if exists cash_movements_origin_check;
alter table public.cash_movements
add constraint cash_movements_origin_check
check (origin in ('sale', 'manual_expense', 'manual_income', 'stock'));

alter table public.cash_movements drop constraint if exists cash_movements_payment_method_check;
alter table public.cash_movements alter column payment_method drop not null;
alter table public.cash_movements
add constraint cash_movements_payment_method_check
check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro'));

update public.cash_movements
set amount = abs(amount)
where amount < 0;

update public.cash_movements
set movement_code = 'CX-' || lpad(nextval('public.cash_movement_code_seq')::text, 6, '0')
where movement_code is null;

alter table public.cash_movements alter column movement_code set not null;
create unique index if not exists cash_movements_movement_code_key on public.cash_movements (movement_code);

alter table public.stock_movements add column if not exists sale_id uuid references public.sales(id) on delete set null;
alter table public.stock_movements add column if not exists cash_movement_id uuid references public.cash_movements(id) on delete set null;

drop trigger if exists cash_movements_set_updated_at on public.cash_movements;
create trigger cash_movements_set_updated_at before update on public.cash_movements
for each row execute function public.set_updated_at();

drop trigger if exists cash_movements_set_code on public.cash_movements;
create trigger cash_movements_set_code before insert on public.cash_movements
for each row execute function public.set_cash_movement_code();

create index if not exists cash_movements_type_idx on public.cash_movements (type);
create index if not exists cash_movements_origin_idx on public.cash_movements (origin);
create index if not exists stock_movements_sale_id_idx on public.stock_movements (sale_id);
create index if not exists stock_movements_cash_movement_id_idx on public.stock_movements (cash_movement_id);

create or replace function public.register_sale_with_cash_and_stock(
  p_items jsonb,
  p_payment_method text,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid()
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
  v_movement_code text;
  v_total numeric(12, 2);
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_stock integer;
  v_product_name text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto para registrar a venda.';
  end if;

  if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  select coalesce(sum(((item->>'quantity')::integer) * ((item->>'unit_price')::numeric)), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Total da venda deve ser maior que zero.';
  end if;

  insert into public.sales (user_id, total_amount, payment_method, status, sale_date)
  values (coalesce(p_user_id, auth.uid()), v_total, p_payment_method, 'finalizada', coalesce(p_movement_date, current_date))
  returning id into v_sale_id;

  insert into public.cash_movements (
    user_id,
    created_by,
    sale_id,
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
    'income',
    'sale',
    'Venda',
    v_total,
    coalesce(p_movement_date, current_date),
    p_payment_method,
    p_notes
  )
  returning public.cash_movements.id, public.cash_movements.movement_code
  into v_cash_movement_id, v_movement_code;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    if v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
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

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    values (v_sale_id, v_product_id, v_quantity, v_unit_price, v_quantity * v_unit_price);

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product_id;

    insert into public.stock_movements (
      user_id,
      product_id,
      sale_id,
      cash_movement_id,
      type,
      reason,
      quantity,
      notes
    )
    values (
      coalesce(p_user_id, auth.uid()),
      v_product_id,
      v_sale_id,
      v_cash_movement_id,
      'saida',
      'venda',
      v_quantity,
      'Venda ' || v_movement_code
    );
  end loop;

  update public.cash_movements
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
    'Venda ' || v_movement_code
  )
  where id = v_cash_movement_id;

  return query select v_sale_id, v_cash_movement_id, v_movement_code;
end;
$$;

grant execute on function public.register_sale_with_cash_and_stock(jsonb, text, date, text, uuid) to authenticated;
